import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

interface SuccessPayload<T> {
  success: true;
  message: string;
  data: T;
  meta?: Meta;
}

/**
 * Sends a standardized success response.
 * Shape: { success: true, message, data, meta? }
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Meta,
): Response<SuccessPayload<T>> {
  const payload: SuccessPayload<T> = {
    success: true,
    message,
    data,
  };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

export function paginationMeta(page: number, limit: number, total: number): Meta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
