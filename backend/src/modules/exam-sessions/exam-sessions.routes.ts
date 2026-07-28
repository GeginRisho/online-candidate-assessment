import { Router } from 'express';
import { requireAuth, requireRole, optionalAuth } from '@middleware/auth';
import { validate } from '@middleware/validate';
import {
  startSessionSchema,
  getSessionSchema,
  saveAnswerSchema,
  warningSessionSchema,
  submitSessionSchema,
  heartbeatSessionSchema,
  selectDomainSchema,
} from './exam-sessions.validation';
import * as sessionsController from './exam-sessions.controller';

export const sessionsRouter = Router();

// Candidate registration starts the session, but we keep this as optional/public
sessionsRouter.post(
  '/',
  optionalAuth,
  validate(startSessionSchema),
  sessionsController.startSession,
);

sessionsRouter.get(
  '/my',
  requireAuth,
  requireRole('CANDIDATE'),
  sessionsController.getMySessions,
);

// Admin-only endpoints
sessionsRouter.get(
  '/all',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.getAllSessionsAdmin,
);

sessionsRouter.get(
  '/export',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.exportResults,
);

sessionsRouter.get(
  '/:id/export',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.exportIndividualResult,
);

sessionsRouter.post(
  '/candidates/:candidateId/approve',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.approveCandidate,
);

sessionsRouter.post(
  '/candidates/:candidateId/reject',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.rejectCandidate,
);

sessionsRouter.post(
  '/candidates/:candidateId/start-exam',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.startCandidateExam,
);

sessionsRouter.post(
  '/approve-all',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.approveAllCandidates,
);

sessionsRouter.post(
  '/:id/allow-reattempt',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.allowReattempt,
);

sessionsRouter.post(
  '/:id/disqualify',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.disqualifySession,
);

sessionsRouter.post(
  '/:id/force-submit',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.forceSubmitSession,
);

sessionsRouter.post(
  '/:id/reset',
  requireAuth,
  requireRole('ADMIN'),
  sessionsController.resetSession,
);

// Shared / Candidate endpoints (Using optionalAuth, secure check via sessionId in controller)
sessionsRouter.get(
  '/:id',
  optionalAuth,
  validate(getSessionSchema),
  sessionsController.getSessionById,
);

sessionsRouter.post(
  '/:id/answer',
  optionalAuth,
  validate(saveAnswerSchema),
  sessionsController.saveAnswer,
);

sessionsRouter.post(
  '/:id/warning',
  optionalAuth,
  validate(warningSessionSchema),
  sessionsController.logWarning,
);

sessionsRouter.post(
  '/:id/submit',
  optionalAuth,
  validate(submitSessionSchema),
  sessionsController.submitSession,
);

sessionsRouter.post(
  '/:id/heartbeat',
  optionalAuth,
  validate(heartbeatSessionSchema),
  sessionsController.heartbeat,
);

sessionsRouter.post(
  '/:id/select-domain',
  optionalAuth,
  validate(selectDomainSchema),
  sessionsController.selectDomain,
);
