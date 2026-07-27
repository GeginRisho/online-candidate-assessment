import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '@middleware/auth';
import { validate } from '@middleware/validate';
import {
  createQuestionSchema,
  updateQuestionSchema,
  getQuestionSchema,
  importQuestionsSchema,
} from './questions.validation';
import * as questionsController from './questions.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const questionsRouter = Router();

// Admins only for all question bank routes
questionsRouter.use(requireAuth, requireRole('ADMIN'));

questionsRouter.get('/', questionsController.getQuestions);
questionsRouter.get('/:id', validate(getQuestionSchema), questionsController.getQuestionById);
questionsRouter.post('/', validate(createQuestionSchema), questionsController.createQuestion);
questionsRouter.put('/:id', validate(updateQuestionSchema), questionsController.updateQuestion);
questionsRouter.delete('/:id', validate(getQuestionSchema), questionsController.deleteQuestion);

// Bulk Import
questionsRouter.post('/import/json', validate(importQuestionsSchema), questionsController.importQuestions);
questionsRouter.post('/import/excel', upload.single('file'), questionsController.importExcelQuestions);
