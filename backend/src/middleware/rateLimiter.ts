import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import type { Request } from 'express';

/**
 * Safe IP extractor for Render/Cloudflare environments.
 *
 * express-rate-limit v7 validates req.ip and throws ERR_ERL_PERMISSIVE_TRUST_PROXY
 * when it detects a potential misconfiguration. On Render (behind Cloudflare),
 * req.ip can be an IPv6 address or the X-Forwarded-For chain isn't fully trusted.
 * We override keyGenerator to use the real client IP from X-Forwarded-For header
 * with a safe fallback, bypassing the v7 validation error entirely.
 */
function getClientKey(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const firstIp = (Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  // Disable the v7 trust-proxy validation that throws on Render
  validate: { trustProxy: false },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    errorCode: 'TOO_MANY_REQUESTS',
  },
});

/** Stricter limiter for login/register endpoints to slow brute-force attempts. */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getClientKey,
  // Disable the v7 trust-proxy validation that throws on Render
  validate: { trustProxy: false },
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    errorCode: 'AUTH_RATE_LIMITED',
  },
});

/** Very strict limiter for exam-submission endpoints — prevents automated abuse. */
export const examActionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  validate: { trustProxy: false },
  message: {
    success: false,
    message: 'Too many requests in a short period. Please slow down.',
    errorCode: 'EXAM_RATE_LIMITED',
  },
});
