import { z } from 'zod';
import { ExamStatus } from '@prisma/client';

const examStatusEnum = z.nativeEnum(ExamStatus);

export const createExamSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    description: z.string().max(2000).optional(),
    status: examStatusEnum.default(ExamStatus.DRAFT),
    isActive: z.boolean().optional(),
    aptitudeDurationSec: z.number().int().min(60, 'Aptitude duration must be at least 60 seconds'),
    technicalDurationSec: z.number().int().min(60, 'Technical duration must be at least 60 seconds'),
    aptitudeQuestionCount: z.number().int().min(0),
    technicalQuestionCount: z.number().int().min(0),
    passingScorePercent: z.number().min(0).max(100).default(40),
    maxWarnings: z.number().int().min(1).default(3),
    autoDisqualifyEnabled: z.boolean().default(true),
    requireFullscreen: z.boolean().default(true),
    requireCamera: z.boolean().default(true),
    shuffleQuestions: z.boolean().default(true),
    shuffleOptions: z.boolean().default(true),
    scheduledStart: z.string().datetime().optional().nullable(),
    scheduledEnd: z.string().datetime().optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateExamSchema = z.object({
  body: createExamSchema.shape.body.partial(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid exam ID format'),
  }),
});

export const getExamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid exam ID format'),
  }),
});

export type CreateExamInput = z.infer<typeof createExamSchema>['body'];
export type UpdateExamInput = z.infer<typeof updateExamSchema>['body'];
