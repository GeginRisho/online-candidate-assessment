import { Router } from 'express';
import { requireAuth, requireRole } from '@middleware/auth';
import { validate } from '@middleware/validate';
import { createExamSchema, updateExamSchema, getExamSchema } from './exams.validation';
import * as examsController from './exams.controller';

export const examsRouter = Router();

// Public endpoint (accessible without auth)
examsRouter.get('/public/:qrToken', examsController.getExamByQrToken);

// Require authenticated user for all following exam endpoints
examsRouter.use(requireAuth);

examsRouter.get('/', examsController.getExams);
examsRouter.get('/:id', validate(getExamSchema), examsController.getExamById);

// Admin-only endpoints
examsRouter.post(
  '/',
  requireRole('ADMIN'),
  validate(createExamSchema),
  examsController.createExam,
);

examsRouter.put(
  '/:id',
  requireRole('ADMIN'),
  validate(updateExamSchema),
  examsController.updateExam,
);

examsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(getExamSchema),
  examsController.deleteExam,
);

examsRouter.post(
  '/:id/qr',
  requireRole('ADMIN'),
  validate(getExamSchema),
  examsController.generateQrToken,
);
