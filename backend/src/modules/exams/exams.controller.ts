import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@utils/ApiResponse';
import { UnauthorizedError } from '@utils/AppError';
import * as examsService from './exams.service';

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin credentials required');
  }
  const exam = await examsService.createExam(req.body, req.user.id);
  sendSuccess(res, exam, 'Exam created successfully', 201);
});

export const getExams = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  const exams = await examsService.getExams(req.user.role);
  sendSuccess(res, exams, 'Exams retrieved successfully');
});

export const getExamById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const exam = await examsService.getExamById(id);
  sendSuccess(res, exam, 'Exam retrieved successfully');
});

export const updateExam = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const exam = await examsService.updateExam(id, req.body);
  sendSuccess(res, exam, 'Exam updated successfully');
});

export const deleteExam = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await examsService.deleteExam(id);
  sendSuccess(res, null, 'Exam deleted successfully');
});
