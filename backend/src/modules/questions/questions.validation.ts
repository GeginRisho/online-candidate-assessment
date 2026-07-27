import { z } from 'zod';
import { QuestionType, QuestionFormat, DifficultyLevel } from '@prisma/client';

const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const createQuestionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(QuestionType),
    format: z.nativeEnum(QuestionFormat).default(QuestionFormat.MCQ_SINGLE),
    domain: z.string().min(1, 'Domain is required').max(100),
    topic: z.string().max(100).optional().nullable(),
    difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
    text: z.string().min(1, 'Question text is required'),
    codeSnippet: z.string().optional().nullable(),
    options: z.array(optionSchema).optional().nullable(),
    correctAnswer: z.any().refine((val) => val !== undefined, 'Correct answer is required'),
    explanation: z.string().optional().nullable(),
    marks: z.number().int().min(1).default(1),
    negativeMarks: z.number().nonnegative().default(0),
    timeLimitSec: z.number().int().positive().optional().nullable(),
    tags: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateQuestionSchema = z.object({
  body: createQuestionSchema.shape.body.partial(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid question ID format'),
  }),
});

export const getQuestionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid question ID format'),
  }),
});

export const importQuestionsSchema = z.object({
  body: z.array(createQuestionSchema.shape.body),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>['body'];
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];
