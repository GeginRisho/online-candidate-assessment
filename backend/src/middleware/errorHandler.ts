import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@utils/AppError';
import { logger } from '@config/logger';
import { isProduction } from '@config/env';

interface ErrorResponseBody {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
  stack?: string;
}

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return new AppError(`A record with this ${target} already exists.`, 409, 'DUPLICATE_ENTRY');
    }
    case 'P2025':
      return new AppError('Record not found.', 404, 'NOT_FOUND');
    case 'P2003':
      return new AppError('Related record not found (foreign key constraint).', 400, 'FK_CONSTRAINT');
    default:
      return new AppError('Database error occurred.', 500, 'DATABASE_ERROR');
  }
}

/**
 * Centralized error-handling middleware. Must be registered LAST, after all
 * routes. Normalizes known error types (AppError, Zod, Prisma) into a
 * consistent JSON shape and logs unexpected errors with full context.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = new AppError('Validation failed', 422, 'VALIDATION_ERROR', err.flatten());
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError('Invalid data provided to database.', 400, 'DATABASE_VALIDATION_ERROR');
  } else {
    appError = new AppError(
      isProduction ? 'Something went wrong. Please try again later.' : err.message,
      500,
      'INTERNAL_ERROR',
    );
  }

  const logContext = {
    method: req.method,
    path: req.originalUrl,
    statusCode: appError.statusCode,
    errorCode: appError.errorCode,
    ip: req.ip,
    userId: (req as unknown as { user?: { id?: string } }).user?.id,
  };

  if (appError.statusCode >= 500) {
    logger.error({ ...logContext, stack: err.stack, err }, appError.message);
  } else {
    logger.warn(logContext, appError.message);
  }

  const body: ErrorResponseBody = {
    success: false,
    message: appError.message,
    errorCode: appError.errorCode,
  };

  if (appError.details) body.details = appError.details;
  if (!isProduction) body.stack = err.stack;

  res.status(appError.statusCode).json(body);
}

/** 404 handler for unmatched routes — registered after all routes, before errorHandler. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
}
