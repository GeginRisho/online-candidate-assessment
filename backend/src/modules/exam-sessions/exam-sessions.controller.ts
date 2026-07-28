import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@utils/ApiResponse';
import { UnauthorizedError } from '@utils/AppError';
import * as sessionsService from './exam-sessions.service';

export const startSession = asyncHandler(async (req: Request, res: Response) => {
  // Candidate registration starts the session, but we keep this for compatibility
  const candidateId = req.user?.id || req.body.candidateId;
  if (!candidateId) {
    throw new UnauthorizedError('Candidate identity required');
  }
  const { examId } = req.body;
  const browserInfo = req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : undefined;
  const session = await sessionsService.startSession(
    examId,
    candidateId,
    req.ip,
    browserInfo,
  );
  sendSuccess(res, session, 'Exam session started successfully', 201);
});

export const getSessionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = req.user?.role || 'CANDIDATE';
  const session = await sessionsService.getSessionDetails(id, role);
  sendSuccess(res, session, 'Session retrieved successfully');
});

export const saveAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // sessionId
  const answer = await sessionsService.saveAnswer(id, req.user?.id, req.body);
  sendSuccess(res, answer, 'Answer saved successfully');
});

export const logWarning = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // sessionId
  const browserInfo = req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : undefined;
  const result = await sessionsService.logWarning(id, req.user?.id, {
    ...req.body,
    browserInfo,
    ipAddress: req.ip,
  });
  sendSuccess(res, result, 'Warning logged successfully');
});

export const submitSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // sessionId
  const isAutoSubmit = req.body.isAutoSubmit === true;
  const result = await sessionsService.submitSession(id, req.user?.id, isAutoSubmit);
  sendSuccess(res, result, 'Exam submitted successfully');
});

export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // sessionId
  const { webcamStatus, microphoneStatus, fullscreenStatus, currentQuestionNum } = req.body || {};
  const session = await sessionsService.heartbeat(id, req.user?.id, {
    webcamStatus,
    microphoneStatus,
    fullscreenStatus,
    currentQuestionNum,
  });
  sendSuccess(res, session, 'Heartbeat acknowledged');
});

export const getMySessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'CANDIDATE') {
    throw new UnauthorizedError('Candidate authentication required');
  }
  const sessions = await sessionsService.getCandidateActiveSessions(req.user.id);
  sendSuccess(res, sessions, 'Candidate sessions retrieved');
});

export const disqualifySession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { id } = req.params; // sessionId
  const { reason } = req.body;
  const session = await sessionsService.disqualifySession(id, reason || 'Disqualified by proctor', req.user.id);
  sendSuccess(res, session, 'Candidate session disqualified');
});

export const forceSubmitSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { id } = req.params; // sessionId
  const result = await sessionsService.forceSubmitSession(id, req.user.id);
  sendSuccess(res, result, 'Candidate session force submitted');
});

export const exportResults = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  await sessionsService.exportResults(res);
});

export const exportIndividualResult = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { id } = req.params;
  await sessionsService.exportIndividualResult(id, res);
});

export const getAllSessionsAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const sessions = await sessionsService.getAllSessionsAdmin();
  sendSuccess(res, sessions, 'All candidate sessions retrieved');
});

export const approveCandidate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { candidateId } = req.params;
  const result = await sessionsService.approveCandidate(candidateId);
  sendSuccess(res, result, 'Candidate approved successfully');
});

export const rejectCandidate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { candidateId } = req.params;
  const result = await sessionsService.rejectCandidate(candidateId);
  sendSuccess(res, result, 'Candidate rejected successfully');
});

export const startCandidateExam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { candidateId } = req.params;
  const result = await sessionsService.startCandidateExam(candidateId);
  sendSuccess(res, result, 'Exam started for candidate');
});

export const selectDomain = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { domain } = req.body;
  const result = await sessionsService.selectDomain(id, domain);
  sendSuccess(res, result, 'Domain selected successfully');
});

export const resetSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { id } = req.params;
  const result = await sessionsService.resetSession(id, req.user.id);
  sendSuccess(res, result, 'Candidate exam session reset successfully');
});

export const approveAllCandidates = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const result = await sessionsService.approveAllCandidates(req.user.id);
  sendSuccess(res, result, 'All pending candidates approved successfully');
});

export const allowReattempt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const { id } = req.params;
  const { reason } = req.body;
  const result = await sessionsService.allowReattempt(id, reason, req.user.id);
  sendSuccess(res, result, 'Candidate reattempt granted successfully');
});
