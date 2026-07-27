import { Response } from 'express';
import { env, isProduction } from '@config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

export function setRefreshTokenCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: `${env.API_PREFIX}/auth`,
    maxAge: maxAgeMs,
    signed: true,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: `${env.API_PREFIX}/auth`,
  });
}

export { REFRESH_COOKIE_NAME };
