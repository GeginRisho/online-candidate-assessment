import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import type { Request } from 'express';

/**
 * Safe IP extractor for Render/Cloudflare environments.
 *
 * express-rate-limit v7 throws ERR_ERL_PERMISSIVE_TRUST_PROXY,
 * ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and ERR_ERL_UNDEFINED_IP_ADDRESS
 * when running behind Cloudflare/Render proxies.
 *
 * Fix: custom keyGenerator + disable the IP and trustProxy validations.
 */
function getClientKey(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const firstIp = (Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

// Only disable the validations that cause production crashes on Render/Cloudflare.
// These are the exact option names supported by express-rate-limit@7.5.1.
const validateOpts = {
  trustProxy: false,        // suppress ERR_ERL_PERMISSIVE_TRUST_PROXY
  xForwardedForHeader: false, // suppress ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  ip: false,               // suppress ERR_ERL_UNDEFINED_IP_ADDRESS
};

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  validate: validateOpts,
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
  validate: validateOpts,
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
  validate: validateOpts,
  message: {
    success: false,
    message: 'Too many requests in a short period. Please slow down.',
    errorCode: 'EXAM_RATE_LIMITED',
  },
});
