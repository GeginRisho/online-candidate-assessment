import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '@config/env';
import { UnauthorizedError } from '@utils/AppError';

export type UserRole = 'ADMIN' | 'CANDIDATE';

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // user id (admin or candidate)
  role: UserRole;
  adminRole?: string; // present only for admins: SUPER_ADMIN | ADMIN | RECRUITER | PROCTOR
  email: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  tokenId: string; // maps to RefreshToken row id, for revocation lookups
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
