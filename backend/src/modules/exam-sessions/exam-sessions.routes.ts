import { Router } from 'express';
import { requireAuth, requireRole } from '@middleware/auth';
import { validate } from '@middleware/validate';
import {
  startSessionSchema,
  getSessionSchema,
  saveAnswerSchema,
  warningSessionSchema,
  submitSessionSchema,
  heartbeatSessionSchema,
} from './exam-sessions.validation';
import * as sessionsController from './exam-sessions.controller';

export const sessionsRouter = Router();

// Require authenticated user for all endpoints
sessionsRouter.use(requireAuth);

// Candidate-only endpoints
sessionsRouter.post(
  '/',
  requireRole('CANDIDATE'),
  validate(startSessionSchema),
  sessionsController.startSession,
);

sessionsRouter.get(
  '/my',
  requireRole('CANDIDATE'),
  sessionsController.getMySessions,
);

// Admin-only endpoints
sessionsRouter.get(
  '/all',
  requireRole('ADMIN'),
  sessionsController.getAllSessionsAdmin,
);

sessionsRouter.get(
  '/export',
  requireRole('ADMIN'),
  sessionsController.exportResults,
);

sessionsRouter.get(
  '/:id/export',
  requireRole('ADMIN'),
  sessionsController.exportIndividualResult,
);

// Shared endpoints
sessionsRouter.get(
  '/:id',
  validate(getSessionSchema),
  sessionsController.getSessionById,
);

// Active exam attempt interactions (Candidate-only)
sessionsRouter.post(
  '/:id/answer',
  requireRole('CANDIDATE'),
  validate(saveAnswerSchema),
  sessionsController.saveAnswer,
);

sessionsRouter.post(
  '/:id/warning',
  requireRole('CANDIDATE'),
  validate(warningSessionSchema),
  sessionsController.logWarning,
);

sessionsRouter.post(
  '/:id/submit',
  requireRole('CANDIDATE'),
  validate(submitSessionSchema),
  sessionsController.submitSession,
);

sessionsRouter.post(
  '/:id/heartbeat',
  requireRole('CANDIDATE'),
  validate(heartbeatSessionSchema),
  sessionsController.heartbeat,
);

// Admin proctoring endpoints
sessionsRouter.post(
  '/:id/disqualify',
  requireRole('ADMIN'),
  sessionsController.disqualifySession,
);

sessionsRouter.post(
  '/:id/force-submit',
  requireRole('ADMIN'),
  sessionsController.forceSubmitSession,
);
