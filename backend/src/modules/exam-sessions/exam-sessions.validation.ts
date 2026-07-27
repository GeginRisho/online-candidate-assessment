import { z } from 'zod';
import { WarningType, WarningSeverity } from '@prisma/client';

export const startSessionSchema = z.object({
  body: z.object({
    examId: z.string().uuid('Invalid exam ID format'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getSessionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid session ID format'),
  }),
});

export const submitSessionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid session ID format'),
  }),
});

export const heartbeatSessionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid session ID format'),
  }),
});

export const warningSessionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(WarningType),
    severity: z.nativeEnum(WarningSeverity).default(WarningSeverity.MEDIUM),
    message: z.string().min(1, 'Warning message is required'),
    metadata: z.record(z.any()).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid session ID format'),
  }),
});

export const saveAnswerSchema = z.object({
  body: z.object({
    questionId: z.string().uuid('Invalid question ID format'),
    selectedOptions: z.array(z.string()).optional().nullable(),
    codeAnswer: z.string().optional().nullable(),
    textAnswer: z.string().optional().nullable(),
    timeSpentSec: z.number().int().nonnegative().default(0),
    isFlagged: z.boolean().default(false),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid session ID format'),
  }),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>['body'];
export type WarningSessionInput = z.infer<typeof warningSessionSchema>['body'];
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>['body'];
