import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, UserRole } from '@utils/jwt';
import { ForbiddenError, UnauthorizedError } from '@utils/AppError';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  // Fallback to httpOnly cookie for browser-based candidate sessions
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken as string;
  }
  return null;
}

/** Requires a valid access token. Populates req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    throw new UnauthorizedError('Authentication token missing');
  }

  const payload = verifyAccessToken(token);
  req.user = {
    id: payload.sub,
    role: payload.role,
    email: payload.email,
    adminRole: payload.adminRole,
  };
  next();
}

/** Restricts access to specific top-level roles (ADMIN / CANDIDATE). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    next();
  };
}

/** Restricts access to specific admin sub-roles (SUPER_ADMIN / ADMIN / RECRUITER / PROCTOR). */
export function requireAdminRole(...adminRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }
    if (!req.user.adminRole || !adminRoles.includes(req.user.adminRole)) {
      throw new ForbiddenError('Insufficient admin privileges for this action');
    }
    next();
  };
}

/** Attaches req.user if a valid token is present, but does not fail if absent. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      adminRole: payload.adminRole,
    };
  } catch {
    // ignore invalid token in optional auth
  }
  next();
}
