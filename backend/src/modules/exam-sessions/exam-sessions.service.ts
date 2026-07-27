import { prisma } from '@config/prisma';
import { ForbiddenError, NotFoundError } from '@utils/AppError';
import { emitToMonitors, emitToSession, SOCKET_EVENTS } from '@sockets/index';
import type { SaveAnswerInput, WarningSessionInput } from './exam-sessions.validation';
import { ExamSessionStatus } from '@prisma/client';
import { formatQuestion } from '@utils/formatQuestion';

export async function startSession(
  examId: string,
  candidateId: string,
  ipAddress?: string,
  browserInfo?: any,
) {
  // Check if exam exists and is active/scheduled
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new NotFoundError('Exam not found');
  if (exam.status !== 'ACTIVE' && exam.status !== 'SCHEDULED') {
    throw new ForbiddenError('This exam is not active for candidates');
  }

  // Find or create session
  const existing = await prisma.examSession.findUnique({
    where: { examId_candidateId: { examId, candidateId } },
  });

  if (existing) {
    const blockedStatuses: ExamSessionStatus[] = ['SUBMITTED', 'AUTO_SUBMITTED', 'DISQUALIFIED', 'EXPIRED'];
    if (blockedStatuses.includes(existing.status)) {
      throw new ForbiddenError(`Cannot resume exam: Session has status ${existing.status}`);
    }

    // Resume session
    const updated = await prisma.examSession.update({
      where: { id: existing.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: existing.startedAt ?? new Date(),
        lastHeartbeatAt: new Date(),
        ipAddress: ipAddress ?? existing.ipAddress,
        browserInfo: browserInfo ? { ...((existing.browserInfo as object) || {}), ...browserInfo } : existing.browserInfo,
      },
    });

    // Notify proctors
    emitToMonitors(examId, SOCKET_EVENTS.SESSION_UPDATE, {
      sessionId: updated.id,
      candidateId,
      status: updated.status,
      lastHeartbeatAt: updated.lastHeartbeatAt,
    });

    return updated;
  }

  // Create new session
  const session = await prisma.examSession.create({
    data: {
      examId,
      candidateId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
      ipAddress,
      browserInfo,
    },
  });

  // Update candidate status
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: 'IN_PROGRESS' },
  });

  // Notify proctors
  emitToMonitors(examId, SOCKET_EVENTS.SESSION_STARTED, {
    sessionId: session.id,
    candidateId,
    status: session.status,
    startedAt: session.startedAt,
  });

  return session;
}

export async function getSessionDetails(id: string, role: 'ADMIN' | 'CANDIDATE') {
  const session = await prisma.examSession.findUnique({
    where: { id },
    include: {
      exam: {
        include: {
          examQuestions: {
            orderBy: { order: 'asc' },
            include: {
              question: true,
            },
          },
        },
      },
      candidate: {
        select: {
          id: true,
          email: true,
          fullName: true,
          collegeName: true,
          branch: true,
        },
      },
      answers: true,
      warnings: true,
    },
  });

  if (!session) throw new NotFoundError('Exam session not found');

  const cleanExamQuestions = session.exam.examQuestions.map((eq) => {
    const formatted = formatQuestion(eq.question);
    if (role === 'CANDIDATE') {
      // Omit correct answer and explanation to prevent client-side inspection cheating
      const { correctAnswer, explanation, ...safeQuestion } = formatted;
      return { ...eq, question: safeQuestion };
    }
    return { ...eq, question: formatted };
  });

  if (session.exam.shuffleQuestions) {
    // Shuffling questions deterministically based on sessionId seed or simply randomly
    cleanExamQuestions.sort(() => 0.5 - Math.random());
  }

  // If shuffleOptions is true and format is MCQ, shuffle the options for candidate
  if (session.exam.shuffleOptions && role === 'CANDIDATE') {
    cleanExamQuestions.forEach((eq) => {
      const q = eq.question as any;
      if (q.options && Array.isArray(q.options)) {
        q.options = [...q.options].sort(() => 0.5 - Math.random());
      }
    });
  }

  return {
    ...session,
    exam: {
      ...session.exam,
      examQuestions: cleanExamQuestions,
    },
  };
}

export async function saveAnswer(sessionId: string, candidateId: string, input: SaveAnswerInput) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== 'IN_PROGRESS') {
    throw new ForbiddenError('Cannot save answer: Exam session is not in progress');
  }

  const { questionId, selectedOptions, codeAnswer, textAnswer, timeSpentSec, isFlagged } = input;

  // Verify question exists
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new NotFoundError('Question not found');

  const existingAnswer = await prisma.answer.findUnique({
    where: { examSessionId_questionId: { examSessionId: sessionId, questionId } },
  });

  if (existingAnswer) {
    return prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        selectedOptions: selectedOptions !== undefined ? (selectedOptions as any) : (existingAnswer.selectedOptions as any),
        codeAnswer: codeAnswer ?? existingAnswer.codeAnswer,
        textAnswer: textAnswer ?? existingAnswer.textAnswer,
        timeSpentSec: existingAnswer.timeSpentSec + timeSpentSec,
        isFlagged,
        isAutoSaved: true,
      },
    });
  }

  return prisma.answer.create({
    data: {
      examSessionId: sessionId,
      candidateId,
      questionId,
      selectedOptions: selectedOptions !== null ? (selectedOptions as any) : undefined,
      codeAnswer,
      textAnswer,
      timeSpentSec,
      isFlagged,
      isAutoSaved: true,
    },
  });
}

export async function logWarning(sessionId: string, candidateId: string, input: WarningSessionInput) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: true },
  });

  if (!session || session.status !== 'IN_PROGRESS') {
    throw new ForbiddenError('Cannot log warning: Exam session is not active');
  }

  // Log the warning record
  const warning = await prisma.warning.create({
    data: {
      examSessionId: sessionId,
      candidateId,
      type: input.type,
      severity: input.severity,
      message: input.message,
      metadata: input.metadata || undefined,
    },
  });

  const nextWarningCount = session.warningCount + 1;
  const shouldDisqualify = session.exam.autoDisqualifyEnabled && nextWarningCount >= session.exam.maxWarnings;

  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      warningCount: nextWarningCount,
      status: shouldDisqualify ? 'DISQUALIFIED' : undefined,
      isDisqualified: shouldDisqualify ? true : undefined,
      disqualifyReason: shouldDisqualify ? 'Max proctoring warnings exceeded' : undefined,
      endedAt: shouldDisqualify ? new Date() : undefined,
    },
  });

  if (shouldDisqualify) {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: 'DISQUALIFIED' },
    });
  }

  // Notify socket room
  emitToMonitors(session.examId, SOCKET_EVENTS.SESSION_WARNING, {
    sessionId,
    candidateId,
    warning,
    totalWarnings: nextWarningCount,
    status: updatedSession.status,
    isDisqualified: updatedSession.isDisqualified,
  });

  if (shouldDisqualify) {
    emitToSession(sessionId, SOCKET_EVENTS.SESSION_DISQUALIFIED, {
      reason: 'Max proctoring warnings exceeded',
    });
  }

  return { warning, session: updatedSession };
}

export async function submitSession(sessionId: string, candidateId: string, isAutoSubmit = false) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: {
              question: true,
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!session) throw new NotFoundError('Session not found');
  if (session.status !== 'IN_PROGRESS') {
    throw new ForbiddenError('Exam session is already submitted or inactive');
  }

  const endedAt = new Date();
  const durationSec = Math.floor((endedAt.getTime() - (session.startedAt?.getTime() ?? endedAt.getTime())) / 1000);

  // Grade MCQs and compute scores
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let aptitudeScore = 0;
  let technicalScore = 0;
  let totalMarks = 0;

  const gradingPromises = session.exam.examQuestions.map(async (eq) => {
    const question = eq.question;
    totalMarks += question.marks;

    const answer = session.answers.find((a) => a.questionId === question.id);
    if (!answer) {
      unansweredCount++;
      return;
    }

    let isCorrect = false;

    // Check correctness based on type
    if (question.format === 'MCQ_SINGLE' || question.format === 'TRUE_FALSE') {
      const selected = (answer.selectedOptions as string[] | null)?.[0];
      const correct = (question.correctAnswer as string[] | null)?.[0];
      isCorrect = selected !== undefined && selected === correct;
    } else if (question.format === 'MCQ_MULTIPLE') {
      const selected = (answer.selectedOptions as string[] | null) || [];
      const correct = (question.correctAnswer as string[] | null) || [];
      isCorrect =
        selected.length === correct.length &&
        selected.every((o) => correct.includes(o));
    } else if (question.format === 'CODING') {
      // Stub check output matching
      isCorrect = answer.codeAnswer?.trim() === (question.correctAnswer as string)?.trim();
    } else {
      // Descriptive defaults to correct or pending
      isCorrect = true; 
    }

    const marksAwarded = isCorrect
      ? question.marks
      : -question.negativeMarks;

    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    if (question.type === 'APTITUDE') {
      aptitudeScore += marksAwarded;
    } else {
      technicalScore += marksAwarded;
    }

    // Save graded result on the answer row
    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        isCorrect,
        marksAwarded,
      },
    });
  });

  await Promise.all(gradingPromises);

  const totalScore = aptitudeScore + technicalScore;
  const percentage = totalMarks > 0 ? Math.max(0, (totalScore / totalMarks) * 100) : 0;
  const status = percentage >= session.exam.passingScorePercent ? 'PASS' : 'FAIL';

  // Create Result record
  const result = await prisma.result.create({
    data: {
      examSessionId: sessionId,
      candidateId,
      aptitudeScore: Math.max(0, aptitudeScore),
      technicalScore: Math.max(0, technicalScore),
      totalScore: Math.max(0, totalScore),
      totalMarks,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      status,
      durationSec,
    },
  });

  // Update session and candidate status
  const finalStatus = isAutoSubmit ? 'AUTO_SUBMITTED' : 'SUBMITTED';
  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: finalStatus,
      endedAt,
    },
  });

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: 'COMPLETED' },
  });

  // Broadcast monitoring event
  emitToMonitors(session.examId, SOCKET_EVENTS.SESSION_COMPLETED, {
    sessionId,
    candidateId,
    status: finalStatus,
    endedAt,
    result,
  });

  return { session: updatedSession, result };
}

export async function heartbeat(sessionId: string, candidateId: string) {
  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: { lastHeartbeatAt: new Date() },
  });

  emitToMonitors(updated.examId, SOCKET_EVENTS.SESSION_UPDATE, {
    sessionId,
    candidateId,
    status: updated.status,
    lastHeartbeatAt: updated.lastHeartbeatAt,
  });

  return updated;
}

export async function getCandidateActiveSessions(candidateId: string) {
  return prisma.examSession.findMany({
    where: { candidateId },
    include: {
      exam: true,
    },
  });
}

export async function disqualifySession(sessionId: string, reason: string, adminId: string) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError('Session not found');

  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: 'DISQUALIFIED',
      isDisqualified: true,
      disqualifyReason: reason,
      endedAt: new Date(),
    },
  });

  await prisma.candidate.update({
    where: { id: session.candidateId },
    data: { status: 'DISQUALIFIED' },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'DISQUALIFY',
      entity: 'EXAM_SESSION',
      entityId: sessionId,
      adminId,
      description: `Session disqualified: ${reason}`,
    },
  });

  // Emit sockets
  emitToSession(sessionId, SOCKET_EVENTS.SESSION_DISQUALIFIED, { reason });
  emitToMonitors(session.examId, SOCKET_EVENTS.SESSION_UPDATE, {
    sessionId,
    status: 'DISQUALIFIED',
    isDisqualified: true,
  });

  return updated;
}

export async function forceSubmitSession(sessionId: string, adminId: string) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError('Session not found');

  // Reuse submitSession logic
  const result = await submitSession(sessionId, session.candidateId, true);

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'SUBMIT',
      entity: 'EXAM_SESSION',
      entityId: sessionId,
      adminId,
      description: 'Session force submitted by admin',
    },
  });

  return result;
}

export async function getAllSessionsAdmin() {
  return prisma.examSession.findMany({
    include: {
      candidate: {
        select: {
          id: true,
          candidateCode: true,
          email: true,
          fullName: true,
          phone: true,
          collegeName: true,
          degree: true,
          branch: true,
          graduationYear: true,
          status: true,
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          passingScorePercent: true,
          aptitudeQuestionCount: true,
          technicalQuestionCount: true,
          aptitudeDurationSec: true,
          technicalDurationSec: true,
        },
      },
      answers: {
        select: {
          id: true,
          questionId: true,
          selectedOptions: true,
          isCorrect: true,
          marksAwarded: true,
          isFlagged: true,
          timeSpentSec: true,
        },
      },
      warnings: {
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
        },
      },
      result: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
