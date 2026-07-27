import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@utils/ApiResponse';
import { BadRequestError, UnauthorizedError } from '@utils/AppError';
import * as questionsService from './questions.service';
import { QuestionType, QuestionFormat, DifficultyLevel } from '@prisma/client';

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const question = await questionsService.createQuestion(req.body, req.user.id);
  sendSuccess(res, question, 'Question created successfully', 201);
});

export const getQuestions = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as QuestionType | undefined;
  const format = req.query.format as QuestionFormat | undefined;
  const difficulty = req.query.difficulty as DifficultyLevel | undefined;
  const domain = req.query.domain as string | undefined;
  const search = req.query.search as string | undefined;
  const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;

  const questions = await questionsService.getQuestions({
    type,
    format,
    difficulty,
    domain,
    search,
    isActive,
  });

  sendSuccess(res, questions, 'Questions retrieved successfully');
});

export const getQuestionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const question = await questionsService.getQuestionById(id);
  sendSuccess(res, question, 'Question retrieved successfully');
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const question = await questionsService.updateQuestion(id, req.body);
  sendSuccess(res, question, 'Question updated successfully');
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await questionsService.deleteQuestion(id);
  sendSuccess(res, null, 'Question deleted successfully');
});

export const importQuestions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  const result = await questionsService.importQuestions(req.body, req.user.id);
  sendSuccess(res, result, 'Questions imported successfully', 201);
});

export const importExcelQuestions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin login required');
  }
  if (!req.file) {
    throw new BadRequestError('Excel file is required');
  }

  const parsed = await questionsService.parseExcelQuestions(req.file.buffer);
  if (parsed.length === 0) {
    throw new BadRequestError('No valid questions found in Excel file');
  }

  const result = await questionsService.importQuestions(parsed, req.user.id);
  sendSuccess(res, result, `Successfully imported ${parsed.length} questions from Excel`, 201);
});
