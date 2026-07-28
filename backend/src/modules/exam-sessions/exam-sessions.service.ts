import { prisma } from '@config/prisma';
import { ForbiddenError, NotFoundError, BadRequestError } from '@utils/AppError';
import { emitToMonitors, emitToSession, SOCKET_EVENTS } from '@sockets/index';
import type { SaveAnswerInput, WarningSessionInput } from './exam-sessions.validation';
import { ExamSessionStatus } from '@prisma/client';
import { formatQuestion } from '@utils/formatQuestion';
import { Response } from 'express';
import ExcelJS from 'exceljs';

export async function startSession(
  examId: string,
  candidateId: string,
  ipAddress?: string,
  browserInfo?: any,
) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new NotFoundError('Exam not found');

  // Find or create session
  const existing = await prisma.examSession.findUnique({
    where: { examId_candidateId: { examId, candidateId } },
  });

  if (!existing && !exam.isActive) {
    throw new ForbiddenError('Assessment is not available. Please contact the administrator.');
  }

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

function getRandomSubset<T>(arr: T[], size: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}

export async function getSessionDetails(id: string, role: 'ADMIN' | 'CANDIDATE') {
  let session = await prisma.examSession.findUnique({
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
          degree: true,
          yearOfStudy: true,
          status: true,
        },
      },
      answers: {
        include: {
          question: true,
        },
      },
      warnings: true,
    },
  });

  if (!session) throw new NotFoundError('Exam session not found');

  // Initialize start times when candidate loads the exam page for the first time
  if (role === 'CANDIDATE' && session.status === 'IN_PROGRESS' && !session.aptitudeStartedAt) {
    session = await prisma.examSession.update({
      where: { id },
      data: {
        startedAt: new Date(),
        aptitudeStartedAt: new Date(),
      },
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
            degree: true,
            yearOfStudy: true,
            status: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
        warnings: true,
      },
    });
  }

  // Lazily initialize aptitude questions if none exist and session is in progress
  const hasAptitudeAnswers = session.answers.some(a => a.question.type === 'APTITUDE');
  if (session.status === 'IN_PROGRESS' && !hasAptitudeAnswers) {
    const aptitudePool = session.exam.examQuestions.filter(
      (eq) => eq.question.type === 'APTITUDE'
    );
    const selectedAptitude = getRandomSubset(aptitudePool, session.exam.aptitudeQuestionCount);

    if (selectedAptitude.length > 0) {
      await prisma.answer.createMany({
        data: selectedAptitude.map((eq) => ({
          examSessionId: session!.id,
          candidateId: session!.candidateId,
          questionId: eq.questionId,
          timeSpentSec: 0,
        })),
        skipDuplicates: true,
      });

      // Refetch session
      const refetched = await prisma.examSession.findUnique({
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
              degree: true,
              yearOfStudy: true,
              status: true,
            },
          },
          answers: {
            include: {
              question: true,
            },
          },
          warnings: true,
        },
      });
      if (refetched) {
        session = refetched;
      }
    }
  }

  // Construct mock examQuestions from candidate's answers
  let cleanQuestions = session.answers.map((ans, idx) => {
    const formatted = formatQuestion(ans.question);
    if (role === 'CANDIDATE') {
      const { correctAnswer, explanation, ...safeQuestion } = formatted;
      return {
        id: ans.id,
        examId: session!.examId,
        questionId: ans.questionId,
        order: idx + 1,
        question: safeQuestion,
      };
    }
    return {
      id: ans.id,
      examId: session!.examId,
      questionId: ans.questionId,
      order: idx + 1,
      question: formatted,
    };
  });

  // Deterministic seeded PRNG (mulberry32) — ensures consistent shuffle per session
  function seededRng(seed: number) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Convert session UUID to a numeric seed
  function uuidToSeed(uuid: string): number {
    return uuid.replace(/-/g, '').slice(0, 8).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0);
  }

  function seededShuffle<T>(arr: T[], seed: number): T[] {
    const result = [...arr];
    const rand = seededRng(seed);
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const baseSeed = uuidToSeed(session.id);

  if (session.exam.shuffleQuestions) {
    cleanQuestions = seededShuffle(cleanQuestions, baseSeed);
  }

  // Shuffle options deterministically per question index
  if (session.exam.shuffleOptions && role === 'CANDIDATE') {
    cleanQuestions.forEach((eq, idx) => {
      const q = eq.question as any;
      if (q.options && Array.isArray(q.options)) {
        q.options = seededShuffle(q.options, baseSeed + idx);
      }
    });
  }

  // Get available domains configured for this exam based on assigned technical questions
  const allTechnicalQuestions = session.exam.examQuestions
    .map((eq) => eq.question)
    .filter((q) => q.type === 'TECHNICAL');
  const configuredDomains = Array.from(new Set(allTechnicalQuestions.map((q) => q.domain)));

  // Candidate filtering based on domain selection
  let finalQuestions = cleanQuestions;
  if (role === 'CANDIDATE') {
    finalQuestions = cleanQuestions.filter((eq) => {
      const q = eq.question as any;
      if (q.type === 'APTITUDE') return true;
      if (q.type === 'TECHNICAL') {
        return session!.selectedDomain ? q.domain === session!.selectedDomain : false;
      }
      return false;
    });
  }

  return {
    ...session,
    serverTime: new Date().toISOString(),
    exam: {
      ...session.exam,
      examQuestions: finalQuestions,
    },
    configuredDomains,
  };
}

export async function saveAnswer(sessionId: string, candidateId: string | undefined, input: SaveAnswerInput) {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError('Exam session not found');
  if (session.status !== 'IN_PROGRESS') {
    throw new ForbiddenError('Cannot save answer: Exam session is not in progress');
  }

  const effCandidateId = candidateId || session.candidateId;
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
      candidateId: effCandidateId,
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

export async function logWarning(
  sessionId: string,
  candidateId: string | undefined,
  input: WarningSessionInput & { browserInfo?: any; ipAddress?: string }
) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: true },
  });

  if (!session || session.status !== 'IN_PROGRESS') {
    throw new ForbiddenError('Cannot log warning: Exam session is not active');
  }

  const effCandidateId = candidateId || session.candidateId;

  // Log the warning record
  const warning = await prisma.warning.create({
    data: {
      examSessionId: sessionId,
      candidateId: effCandidateId,
      type: input.type,
      severity: input.severity,
      message: input.message,
      browserInfo: input.browserInfo || null,
      ipAddress: input.ipAddress || null,
      currentQuestionNum: input.currentQuestionNum || null,
      fullscreenStatus: input.fullscreenStatus || null,
      webcamStatus: input.webcamStatus || null,
      visibilityState: input.visibilityState || null,
      metadata: input.metadata || undefined,
    },
  });

  const nextWarningCount = session.warningCount + 1;
  const reachedLimit = nextWarningCount >= 3;

  // Update webcam/fullscreen status if warning is relevant
  let webcamStatusUpdate = undefined;
  let fullscreenStatusUpdate = undefined;
  if (input.type === 'CAMERA_DISCONNECT') {
    webcamStatusUpdate = 'DISCONNECTED';
  }
  if (input.type === 'FULLSCREEN_EXIT') {
    fullscreenStatusUpdate = 'EXITED';
  }

  let updatedSession;
  if (reachedLimit) {
    // Enforce disqualification immediately
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        warningCount: nextWarningCount,
        isDisqualified: true,
        disqualifyReason: `Max proctoring warnings exceeded (3 warnings). Last violation: ${input.type}`,
        webcamStatus: webcamStatusUpdate,
        fullscreenStatus: fullscreenStatusUpdate,
      },
    });

    await prisma.candidate.update({
      where: { id: effCandidateId },
      data: { status: 'DISQUALIFIED' },
    });

    const submitResult = await submitSession(sessionId, effCandidateId, true);
    updatedSession = submitResult.session;

    emitToSession(sessionId, SOCKET_EVENTS.SESSION_DISQUALIFIED, {
      reason: `Max proctoring warnings exceeded (3 warnings). Last violation: ${input.type}`,
    });
  } else {
    updatedSession = await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        warningCount: nextWarningCount,
        webcamStatus: webcamStatusUpdate,
        fullscreenStatus: fullscreenStatusUpdate,
      },
    });
  }

  // Notify socket room
  emitToMonitors(session.examId, SOCKET_EVENTS.SESSION_WARNING, {
    sessionId,
    candidateId: effCandidateId,
    warning,
    totalWarnings: nextWarningCount,
    status: updatedSession.status,
    isDisqualified: updatedSession.isDisqualified,
  });

  return { warning, session: updatedSession };
}

export async function submitSession(sessionId: string, candidateId: string | undefined, isAutoSubmit = false) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      candidate: true,
      warnings: true,
      exam: true,
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!session) throw new NotFoundError('Session not found');
  if (session.status !== 'IN_PROGRESS') {
    throw new ForbiddenError('Exam session is already submitted or inactive');
  }

  const effCandidateId = candidateId || session.candidateId;
  const endedAt = new Date();
  const durationSec = Math.floor((endedAt.getTime() - (session.startedAt?.getTime() ?? endedAt.getTime())) / 1000);

  // Grade MCQs and compute scores
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let aptitudeScore = 0;
  let technicalScore = 0;
  let totalMarks = 0;

  const gradingPromises = session.answers.map(async (answer) => {
    const question = answer.question;
    totalMarks += question.marks;

    // Check if answered
    const isAnswered = 
      (question.format === 'MCQ_SINGLE' || question.format === 'MCQ_MULTIPLE' || question.format === 'TRUE_FALSE')
        ? (Array.isArray(answer.selectedOptions) && answer.selectedOptions.length > 0)
        : (question.format === 'CODING' ? !!answer.codeAnswer?.trim() : !!answer.textAnswer?.trim());

    if (!isAnswered) {
      unansweredCount++;
      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          isCorrect: false,
          marksAwarded: 0,
        },
      });
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
      isCorrect = answer.codeAnswer?.trim() === (question.correctAnswer as string)?.trim();
    } else {
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
  
  // Calculate if disqualified
  const isSessionDisqualified = session.isDisqualified || (session.warningCount >= 3);
  const status = isSessionDisqualified
    ? 'DISQUALIFIED'
    : (percentage >= session.exam.passingScorePercent ? 'PASS' : 'FAIL');

  // Create Result record
  const result = await prisma.result.create({
    data: {
      examSessionId: sessionId,
      candidateId: effCandidateId,
      
      // Candidate details snapshot
      candidateName: session.candidate.fullName,
      candidateEmail: session.candidate.email,
      candidateCode: session.candidate.candidateCode,
      collegeName: session.candidate.collegeName || null,
      branch: session.candidate.branch || null,
      degree: session.candidate.degree || null,
      graduationYear: session.candidate.graduationYear || null,
      yearOfStudy: session.candidate.yearOfStudy || null,

      // Exam details snapshot
      examName: session.exam.title,
      startTime: session.startedAt,
      endTime: endedAt,
      durationSec,

      // Performance
      aptitudeScore: Math.max(0, aptitudeScore),
      technicalScore: Math.max(0, technicalScore),
      totalScore: Math.max(0, totalScore),
      totalMarks,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      status,

      // Security snapshot
      warningCount: session.warningCount,
      violations: session.warnings.map(w => ({
        type: w.type,
        message: w.message,
        createdAt: w.createdAt,
      })),
      isDisqualified: isSessionDisqualified,
      submissionType: isAutoSubmit ? 'AUTO' : 'MANUAL',
    },
  });

  // Update session and candidate status
  const finalStatus = isSessionDisqualified
    ? 'DISQUALIFIED'
    : (isAutoSubmit ? 'AUTO_SUBMITTED' : 'SUBMITTED');

  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: finalStatus,
      endedAt,
    },
  });

  await prisma.candidate.update({
    where: { id: effCandidateId },
    data: { status: isSessionDisqualified ? 'DISQUALIFIED' : 'COMPLETED' },
  });

  if (isAutoSubmit) {
    emitToSession(sessionId, 'session:autosubmitted', {
      reason: 'Exam auto-submitted',
    });
  }

  // Broadcast monitoring event
  emitToMonitors(session.examId, SOCKET_EVENTS.SESSION_COMPLETED, {
    sessionId,
    candidateId: effCandidateId,
    status: finalStatus,
    endedAt,
    result,
  });

  return { session: updatedSession, result };
}

export async function heartbeat(
  sessionId: string,
  candidateId?: string,
  updates?: { webcamStatus?: string; microphoneStatus?: string; fullscreenStatus?: string; currentQuestionNum?: number }
) {
  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      lastHeartbeatAt: new Date(),
      webcamStatus: updates?.webcamStatus ?? undefined,
      microphoneStatus: updates?.microphoneStatus ?? undefined,
      fullscreenStatus: updates?.fullscreenStatus ?? undefined,
      currentQuestionNum: updates?.currentQuestionNum ?? undefined,
    },
  });

  const effCandidateId = candidateId || updated.candidateId;

  emitToMonitors(updated.examId, SOCKET_EVENTS.SESSION_UPDATE, {
    sessionId,
    candidateId: effCandidateId,
    status: updated.status,
    lastHeartbeatAt: updated.lastHeartbeatAt,
    webcamStatus: updated.webcamStatus,
    microphoneStatus: updated.microphoneStatus,
    fullscreenStatus: updated.fullscreenStatus,
    currentQuestionNum: updated.currentQuestionNum,
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

export async function exportResults(res: Response) {
  const results = await prisma.result.findMany({
    include: {
      candidate: true,
      examSession: {
        include: {
          exam: true,
          warnings: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Candidate Results');

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Mobile', key: 'phone', width: 20 },
    { header: 'College', key: 'college', width: 25 },
    { header: 'Degree', key: 'degree', width: 15 },
    { header: 'Branch', key: 'branch', width: 20 },
    { header: 'Registration Time', key: 'registrationDate', width: 25 },
    { header: 'Start Time', key: 'startTime', width: 25 },
    { header: 'End Time', key: 'endTime', width: 25 },
    { header: 'Total Duration', key: 'duration', width: 15 },
    { header: 'Selected Domain', key: 'selectedDomain', width: 20 },
    { header: 'Aptitude Score', key: 'aptitudeScore', width: 15 },
    { header: 'Technical Score', key: 'technicalScore', width: 15 },
    { header: 'Total Score', key: 'totalScore', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Pass/Fail', key: 'passFail', width: 15 },
    { header: 'Warning Count', key: 'warningCount', width: 15 },
    { header: 'Violation History', key: 'violations', width: 45 },
    { header: 'Attempt Number', key: 'attemptNumber', width: 15 },
    { header: 'Disqualified (Yes/No)', key: 'disqualified', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };

  for (const r of results) {
    const name = r.candidateName || r.candidate.fullName;
    const email = r.candidateEmail || r.candidate.email;
    const phone = r.candidate.phone || '';
    const college = r.collegeName || r.candidate.collegeName || '';
    const branch = r.branch || r.candidate.branch || '';
    const degree = r.degree || r.candidate.degree || '';
    const registrationDate = r.candidate.createdAt ? new Date(r.candidate.createdAt).toLocaleString() : '';

    const startTime = r.startTime || r.examSession.startedAt;
    const endTime = r.endTime || r.examSession.endedAt;
    const durationSec = r.durationSec || (r.examSession.startedAt && r.examSession.endedAt 
      ? Math.floor((new Date(r.examSession.endedAt).getTime() - new Date(r.examSession.startedAt).getTime()) / 1000)
      : 0);

    const selectedDomain = r.examSession.selectedDomain || 'None';
    const warningCount = r.warningCount || r.examSession.warningCount;
    const violationsList = r.violations
      ? (r.violations as any[]).map((v) => `[${v.createdAt ? new Date(v.createdAt).toLocaleTimeString() : ''}] ${v.type}: ${v.message}`).join('; ')
      : r.examSession.warnings.map((w) => `[${w.createdAt ? new Date(w.createdAt).toLocaleTimeString() : ''}] ${w.type}: ${w.message}`).join('; ');

    const attemptNumber = r.examSession.attemptNumber;
    const disqualified = r.isDisqualified || r.examSession.isDisqualified ? 'Yes' : 'No';
    const status = r.examSession.status; // Waiting, Approved, In Progress, Completed, Disqualified

    worksheet.addRow({
      name,
      email,
      phone,
      college,
      degree,
      branch,
      registrationDate,
      startTime: startTime ? new Date(startTime).toLocaleString() : '',
      endTime: endTime ? new Date(endTime).toLocaleString() : '',
      duration: `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
      selectedDomain,
      aptitudeScore: r.aptitudeScore,
      technicalScore: r.technicalScore,
      totalScore: r.totalScore,
      percentage: `${r.percentage.toFixed(2)}%`,
      passFail: r.status,
      warningCount,
      violations: violationsList,
      attemptNumber,
      disqualified,
      status,
    });
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=candidate_results.xlsx',
  );

  await workbook.xlsx.write(res);
  res.end();
}

export async function exportIndividualResult(sessionId: string, res: Response) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      candidate: true,
      warnings: true,
      result: true,
      exam: true,
    },
  });

  if (!session) throw new NotFoundError('Session not found');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Candidate Report');

  // Title Block
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = 'CANDIDATE ASSESSMENT REPORT';
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Candidate Details Section
  worksheet.addRow([]);
  worksheet.addRow(['CANDIDATE PROFILE']).font = { bold: true };
  worksheet.addRow(['Name', session.candidate.fullName, 'Code', session.candidate.candidateCode]);
  worksheet.addRow(['Email', session.candidate.email, 'Phone', session.candidate.phone || 'N/A']);
  worksheet.addRow(['College Name', session.candidate.collegeName || 'N/A', 'Branch', session.candidate.branch || 'N/A']);
  worksheet.addRow(['Degree', session.candidate.degree || 'N/A', 'Year of Study', session.candidate.yearOfStudy || 'N/A']);
  worksheet.addRow(['Graduation Year', session.candidate.graduationYear || 'N/A', 'Registration Date', session.candidate.createdAt ? new Date(session.candidate.createdAt).toLocaleString() : 'N/A']);

  // Exam Details
  worksheet.addRow([]);
  worksheet.addRow(['EXAM DETAILS']).font = { bold: true };
  worksheet.addRow(['Exam Title', session.exam.title, 'Session Status', session.status]);
  worksheet.addRow([
    'Start Time',
    session.startedAt ? new Date(session.startedAt).toLocaleString() : 'N/A',
    'End Time',
    session.endedAt ? new Date(session.endedAt).toLocaleString() : 'N/A',
  ]);
  const durationSec = session.startedAt && session.endedAt
    ? Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;
  worksheet.addRow([
    'Duration',
    `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
    'Selected Track/Domain',
    session.selectedDomain || 'N/A',
  ]);

  // Performance Section (If available)
  if (session.result) {
    worksheet.addRow([]);
    worksheet.addRow(['PERFORMANCE SUMMARY']).font = { bold: true };
    worksheet.addRow(['Aptitude Score', session.result.aptitudeScore, 'Technical Score', session.result.technicalScore]);
    worksheet.addRow(['Total Score', session.result.totalScore, 'Total Marks Available', session.result.totalMarks]);
    worksheet.addRow(['Percentage Obtained', `${session.result.percentage.toFixed(2)}%`, 'Passing Status', session.result.status]);
    worksheet.addRow(['Correct Qs', session.result.correctCount, 'Incorrect Qs', session.result.incorrectCount]);
    worksheet.addRow(['Unanswered Qs', session.result.unansweredCount]);
  }

  // Security details
  worksheet.addRow([]);
  worksheet.addRow(['SECURITY & PROCTORING INTEGRITY']).font = { bold: true };
  worksheet.addRow(['Warning Count', session.warningCount, 'Disqualified Status', session.isDisqualified ? 'Disqualified' : 'Clear']);
  worksheet.addRow([
    'Webcam Status',
    session.webcamStatus || 'INACTIVE',
    'Microphone Status',
    session.microphoneStatus || 'INACTIVE',
    'Fullscreen Status',
    session.fullscreenStatus || 'INACTIVE',
  ]);

  // Violations list
  worksheet.addRow([]);
  worksheet.addRow(['VIOLATION LOGS']).font = { bold: true };
  worksheet.addRow(['Timestamp', 'Warning Type', 'Message', 'IP Address']);
  worksheet.getRow(worksheet.lastRow!.number).font = { bold: true };

  (session.warnings || []).forEach((w) => {
    worksheet.addRow([
      w.createdAt ? new Date(w.createdAt).toLocaleString() : '',
      w.type,
      w.message,
      w.ipAddress || 'N/A',
    ]);
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=report_${session.candidate.candidateCode}.xlsx`,
  );

  await workbook.xlsx.write(res);
  res.end();
}

export async function approveCandidate(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new NotFoundError('Candidate not found');

  const updated = await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: 'APPROVED' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'CANDIDATE',
      entityId: candidateId,
      description: `Candidate ${candidate.email} approved by admin`,
    },
  });

  return updated;
}

export async function rejectCandidate(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new NotFoundError('Candidate not found');

  const updated = await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: 'DISQUALIFIED' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'CANDIDATE',
      entityId: candidateId,
      description: `Candidate ${candidate.email} rejected by admin`,
    },
  });

  return updated;
}

export async function startCandidateExam(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { examSessions: true },
  });
  if (!candidate) throw new NotFoundError('Candidate not found');

  const session = candidate.examSessions[0];
  if (!session) throw new NotFoundError('Candidate exam session not found');

  const updatedCandidate = await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: 'IN_PROGRESS' },
  });

  const updatedSession = await prisma.examSession.update({
    where: { id: session.id },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
    },
  });

  emitToMonitors(session.examId, SOCKET_EVENTS.SESSION_STARTED, {
    sessionId: session.id,
    candidateId,
    status: updatedSession.status,
    startedAt: updatedSession.startedAt,
  });

  return { candidate: updatedCandidate, session: updatedSession };
}

export async function selectDomain(sessionId: string, domain: string) {
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
      answers: {
        include: {
          question: true,
        },
      },
    },
  });
  if (!session) throw new NotFoundError('Session not found');

  const allTechnicalQuestions = session.exam.examQuestions
    .map((eq) => eq.question)
    .filter((q) => q.type === 'TECHNICAL');
  const configuredDomains = Array.from(new Set(allTechnicalQuestions.map((q) => q.domain)));

  if (!configuredDomains.includes(domain)) {
    throw new BadRequestError(`Domain '${domain}' is not configured/available for this exam`);
  }

  // 1. Update the domain on the session and set technicalStartedAt
  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      selectedDomain: domain,
      technicalStartedAt: new Date(),
    },
  });

  // 2. Initialize technical questions for this domain in Answers
  const hasTechAnswers = session.answers.some(a => a.question.type === 'TECHNICAL');
  if (!hasTechAnswers) {
    const techPool = session.exam.examQuestions.filter(
      (eq) => eq.question.type === 'TECHNICAL' && eq.question.domain === domain
    );
    const selectedTech = getRandomSubset(techPool, session.exam.technicalQuestionCount);

    if (selectedTech.length > 0) {
      await prisma.answer.createMany({
        data: selectedTech.map((eq) => ({
          examSessionId: sessionId,
          candidateId: session.candidateId,
          questionId: eq.questionId,
          timeSpentSec: 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  return updated;
}

export async function resetSession(sessionId: string, adminId: string) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundError('Exam session not found');

  // 1. Delete associated Result if any
  await prisma.result.deleteMany({
    where: { examSessionId: sessionId },
  });

  // 2. Delete all warnings
  await prisma.warning.deleteMany({
    where: { examSessionId: sessionId },
  });

  // 3. Delete all answers
  await prisma.answer.deleteMany({
    where: { examSessionId: sessionId },
  });

  // 4. Update candidate status to APPROVED so they can start again
  await prisma.candidate.update({
    where: { id: session.candidateId },
    data: { status: 'APPROVED' },
  });

  // 5. Update session status to NOT_STARTED and clear metadata
  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: 'NOT_STARTED',
      startedAt: null,
      endedAt: null,
      aptitudeStartedAt: null,
      aptitudeEndedAt: null,
      technicalStartedAt: null,
      technicalEndedAt: null,
      warningCount: 0,
      isDisqualified: false,
      disqualifyReason: null,
      selectedDomain: null,
    },
  });

  // 6. Write audit log
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'EXAM_SESSION',
      entityId: sessionId,
      adminId,
      description: `Exam session for candidate ID ${session.candidateId} reset by admin`,
    },
  });

  return updatedSession;
}

export async function approveAllCandidates(adminId: string) {
  const pendingCandidates = await prisma.candidate.findMany({
    where: { status: 'WAITING_APPROVAL' },
  });

  if (pendingCandidates.length === 0) {
    return { count: 0 };
  }

  const candidateIds = pendingCandidates.map((c) => c.id);

  await prisma.candidate.updateMany({
    where: { id: { in: candidateIds } },
    data: { status: 'APPROVED' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'CANDIDATE',
      adminId,
      description: `Approved all ${pendingCandidates.length} waiting candidates`,
      metadata: { candidateIds } as any,
    },
  });

  return { count: pendingCandidates.length };
}

export async function allowReattempt(sessionId: string, reason: string | undefined, adminId: string) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundError('Exam session not found');

  if (session.attemptNumber >= 2) {
    throw new BadRequestError('Maximum attempts reached. Only one reattempt is allowed.');
  }

  // 1. Delete associated Result if any
  await prisma.result.deleteMany({
    where: { examSessionId: sessionId },
  });

  // 2. Delete all warnings
  await prisma.warning.deleteMany({
    where: { examSessionId: sessionId },
  });

  // 3. Delete all answers
  await prisma.answer.deleteMany({
    where: { examSessionId: sessionId },
  });

  // 4. Update candidate status to APPROVED
  await prisma.candidate.update({
    where: { id: session.candidateId },
    data: { status: 'APPROVED' },
  });

  // 5. Increment attempt and reset session
  const nextAttempt = session.attemptNumber + 1;
  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: 'NOT_STARTED',
      startedAt: null,
      endedAt: null,
      aptitudeStartedAt: null,
      aptitudeEndedAt: null,
      technicalStartedAt: null,
      technicalEndedAt: null,
      warningCount: 0,
      isDisqualified: false,
      disqualifyReason: null,
      selectedDomain: null,
      attemptNumber: nextAttempt,
      maxAttempts: 2,
      reattemptReason: reason || 'Granted by administrator',
    },
  });

  // 6. Write audit log
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'EXAM_SESSION',
      entityId: sessionId,
      adminId,
      description: `Allowed candidate ID ${session.candidateId} reattempt number ${nextAttempt} (reason: ${reason || 'N/A'})`,
    },
  });

  return updatedSession;
}
