import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@utils/ApiResponse';
import { UnauthorizedError } from '@utils/AppError';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '@utils/cookies';
import * as authService from './auth.service';
import type { RequestMeta } from './auth.service';

function getRequestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

/** Reads the refresh token from the signed httpOnly cookie, falling back to the body for non-browser clients. */
function extractRefreshToken(req: Request): string {
  const cookieToken = (req.signedCookies?.[REFRESH_COOKIE_NAME] ?? req.cookies?.[REFRESH_COOKIE_NAME]) as
    | string
    | undefined;
  const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const token = cookieToken ?? bodyToken;
  if (!token) throw new UnauthorizedError('Refresh token missing');
  return token;
}

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, user } = await authService.adminLogin(req.body, getRequestMeta(req));

  setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt.getTime() - Date.now());

  sendSuccess(res, { accessToken: tokens.accessToken, user }, 'Login successful');
});

export const candidateRegister = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, user } = await authService.candidateRegister(req.body, getRequestMeta(req));

  setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt.getTime() - Date.now());

  sendSuccess(res, { accessToken: tokens.accessToken, user }, 'Registration successful', 201);
});

export const candidateLogin = asyncHandler(async (req: Request, res: Response) => {
  const { tokens, user } = await authService.candidateLogin(req.body, getRequestMeta(req));

  setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt.getTime() - Date.now());

  sendSuccess(res, { accessToken: tokens.accessToken, user }, 'Login successful');
});

export const getQrRegistration = asyncHandler(async (req: Request, res: Response) => {
  const examId = req.query.examId as string | undefined;
  const result = await authService.generateQrRegistration(examId);
  sendSuccess(res, result, 'QR registration code generated');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = extractRefreshToken(req);
  const { tokens, role } = await authService.rotateRefreshToken(rawRefreshToken, getRequestMeta(req));

  setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt.getTime() - Date.now());

  sendSuccess(res, { accessToken: tokens.accessToken, role }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const cookieToken = (req.signedCookies?.[REFRESH_COOKIE_NAME] ?? req.cookies?.[REFRESH_COOKIE_NAME]) as
    | string
    | undefined;
  const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const token = cookieToken ?? bodyToken;

  if (token) {
    await authService.revokeRefreshToken(token);
  }

  clearRefreshTokenCookie(res);
  sendSuccess(res, null, 'Logged out successfully');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError('Not authenticated');
  const profile = await authService.getCurrentUser(req.user.id, req.user.role);
  sendSuccess(res, profile, 'Current user profile');
});
