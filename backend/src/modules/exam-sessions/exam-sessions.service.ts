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
          degree: true,
          yearOfStudy: true,
          status: true,
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

  // Get available domains configured for this exam based on assigned technical questions
  const allTechnicalQuestions = session.exam.examQuestions
    .map((eq) => eq.question)
    .filter((q) => q.type === 'TECHNICAL');
  const configuredDomains = Array.from(new Set(allTechnicalQuestions.map((q) => q.domain)));

  // Candidate filtering based on domain selection
  let finalQuestions = cleanExamQuestions;
  if (role === 'CANDIDATE') {
    finalQuestions = cleanExamQuestions.filter((eq) => {
      const q = eq.question as any;
      if (q.type === 'APTITUDE') return true;
      if (q.type === 'TECHNICAL') {
        return session.selectedDomain ? q.domain === session.selectedDomain : false;
      }
      return false;
    });
  }

  return {
    ...session,
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
  const reachedLimit = nextWarningCount >= session.exam.maxWarnings;

  let shouldDisqualify = false;
  let shouldAutoSubmit = false;

  if (reachedLimit) {
    if (session.exam.autoDisqualifyEnabled) {
      shouldDisqualify = true;
    } else {
      shouldAutoSubmit = true;
    }
  }

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
  if (shouldDisqualify) {
    updatedSession = await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        warningCount: nextWarningCount,
        status: 'DISQUALIFIED',
        isDisqualified: true,
        disqualifyReason: 'Max proctoring warnings exceeded',
        endedAt: new Date(),
        webcamStatus: webcamStatusUpdate,
        fullscreenStatus: fullscreenStatusUpdate,
      },
    });

    await prisma.candidate.update({
      where: { id: effCandidateId },
      data: { status: 'DISQUALIFIED' },
    });

    emitToSession(sessionId, SOCKET_EVENTS.SESSION_DISQUALIFIED, {
      reason: 'Max proctoring warnings exceeded',
    });
  } else if (shouldAutoSubmit) {
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        warningCount: nextWarningCount,
        webcamStatus: webcamStatusUpdate,
        fullscreenStatus: fullscreenStatusUpdate,
      },
    });
    const submissionResult = await submitSession(sessionId, effCandidateId, true);
    updatedSession = submissionResult.session;
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
  const status = percentage >= session.exam.passingScorePercent ? 'PASS' : 'FAIL';

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
      isDisqualified: session.isDisqualified,
      submissionType: isAutoSubmit ? 'AUTO' : 'MANUAL',
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
    where: { id: effCandidateId },
    data: { status: 'COMPLETED' },
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
    { header: 'Candidate Code', key: 'candidateCode', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone Number', key: 'phone', width: 20 },
    { header: 'College', key: 'college', width: 25 },
    { header: 'Branch', key: 'branch', width: 20 },
    { header: 'Degree', key: 'degree', width: 15 },
    { header: 'Year of Study', key: 'yearOfStudy', width: 15 },
    { header: 'Graduation Year', key: 'year', width: 15 },
    { header: 'Registration Date & Time', key: 'registrationDate', width: 25 },
    { header: 'Exam Name', key: 'examName', width: 25 },
    { header: 'Start Time', key: 'startTime', width: 25 },
    { header: 'End Time', key: 'endTime', width: 25 },
    { header: 'Duration', key: 'duration', width: 15 },
    { header: 'Aptitude Score', key: 'aptitudeScore', width: 15 },
    { header: 'Technical Score', key: 'technicalScore', width: 15 },
    { header: 'Total Score', key: 'totalScore', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
    { header: 'Pass/Fail', key: 'passFail', width: 15 },
    { header: 'Session Status', key: 'sessionStatus', width: 20 },
    { header: 'Warning Count', key: 'warningCount', width: 15 },
    { header: 'Webcam Status', key: 'webcamStatus', width: 15 },
    { header: 'Microphone Status', key: 'microphoneStatus', width: 18 },
    { header: 'Fullscreen Status', key: 'fullscreenStatus', width: 18 },
    { header: 'Violation History', key: 'violations', width: 40 },
  ];

  worksheet.getRow(1).font = { bold: true };

  for (const r of results) {
    const candidateCode = r.candidateCode || r.candidate.candidateCode;
    const name = r.candidateName || r.candidate.fullName;
    const email = r.candidateEmail || r.candidate.email;
    const phone = r.candidate.phone || '';
    const college = r.collegeName || r.candidate.collegeName || '';
    const branch = r.branch || r.candidate.branch || '';
    const degree = r.degree || r.candidate.degree || '';
    const yearOfStudy = r.yearOfStudy || r.candidate.yearOfStudy || '';
    const year = r.graduationYear || (r.candidate.graduationYear ? String(r.candidate.graduationYear) : '');
    const registrationDate = r.candidate.createdAt ? new Date(r.candidate.createdAt).toLocaleString() : '';

    const examName = r.examName || r.examSession.exam.title;
    const startTime = r.startTime || r.examSession.startedAt;
    const endTime = r.endTime || r.examSession.endedAt;
    const durationSec = r.durationSec || (r.examSession.startedAt && r.examSession.endedAt 
      ? Math.floor((new Date(r.examSession.endedAt).getTime() - new Date(r.examSession.startedAt).getTime()) / 1000)
      : 0);

    const sessionStatus = r.examSession.status;
    const warningCount = r.warningCount || r.examSession.warningCount;
    const webcamStatus = r.examSession.webcamStatus || 'INACTIVE';
    const microphoneStatus = r.examSession.microphoneStatus || 'INACTIVE';
    const fullscreenStatus = r.examSession.fullscreenStatus || 'INACTIVE';

    const violationsList = r.violations
      ? (r.violations as any[]).map((v) => `${v.type}: ${v.message}`).join('; ')
      : r.examSession.warnings.map((w) => `${w.type}: ${w.message}`).join('; ');

    worksheet.addRow({
      candidateCode,
      name,
      email,
      phone,
      college,
      branch,
      degree,
      yearOfStudy,
      year,
      registrationDate,
      examName,
      startTime: startTime ? new Date(startTime).toLocaleString() : '',
      endTime: endTime ? new Date(endTime).toLocaleString() : '',
      duration: `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
      aptitudeScore: r.aptitudeScore,
      technicalScore: r.technicalScore,
      totalScore: r.totalScore,
      percentage: `${r.percentage.toFixed(2)}%`,
      passFail: r.status,
      sessionStatus,
      warningCount,
      webcamStatus,
      microphoneStatus,
      fullscreenStatus,
      violations: violationsList,
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
    data: { status: 'VERIFIED' },
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
    include: { exam: { include: { examQuestions: { include: { question: true } } } } },
  });
  if (!session) throw new NotFoundError('Session not found');

  const allTechnicalQuestions = session.exam.examQuestions
    .map((eq) => eq.question)
    .filter((q) => q.type === 'TECHNICAL');
  const configuredDomains = Array.from(new Set(allTechnicalQuestions.map((q) => q.domain)));

  if (!configuredDomains.includes(domain)) {
    throw new BadRequestError(`Domain '${domain}' is not configured/available for this exam`);
  }

  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: { selectedDomain: domain },
  });

  return updated;
}
