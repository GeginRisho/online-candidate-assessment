import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@utils/ApiResponse';
import { UnauthorizedError } from '@utils/AppError';
import * as sessionsService from './exam-sessions.service';

export const startSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'CANDIDATE') {
    throw new UnauthorizedError('Candidate authorization required');
  }
  const { examId } = req.body;
  const browserInfo = req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : undefined;
  const session = await sessionsService.startSession(
    examId,
    req.user.id,
    req.ip,
    browserInfo,
  );
  sendSuccess(res, session, 'Exam session started successfully', 201);
});

export const getSessionById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  const { id } = req.params;
  const session = await sessionsService.getSessionDetails(id, req.user.role);
  sendSuccess(res, session, 'Session retrieved successfully');
});

export const saveAnswer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'CANDIDATE') {
    throw new UnauthorizedError('Candidate authentication required');
  }
  const { id } = req.params; // sessionId
  const answer = await sessionsService.saveAnswer(id, req.user.id, req.body);
  sendSuccess(res, answer, 'Answer saved successfully');
});

export const logWarning = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'CANDIDATE') {
    throw new UnauthorizedError('Candidate authentication required');
  }
  const { id } = req.params; // sessionId
  const result = await sessionsService.logWarning(id, req.user.id, req.body);
  sendSuccess(res, result, 'Warning logged successfully');
});

export const submitSession = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'CANDIDATE') {
    throw new UnauthorizedError('Candidate authentication required');
  }
  const { id } = req.params; // sessionId
  const isAutoSubmit = req.body.isAutoSubmit === true;
  const result = await sessionsService.submitSession(id, req.user.id, isAutoSubmit);
  sendSuccess(res, result, 'Exam submitted successfully');
});

export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'CANDIDATE') {
    throw new UnauthorizedError('Candidate authentication required');
  }
  const { id } = req.params; // sessionId
  const session = await sessionsService.heartbeat(id, req.user.id);
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

export const getAllSessionsAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const sessions = await sessionsService.getAllSessionsAdmin();
  sendSuccess(res, sessions, 'All candidate sessions retrieved');
});
