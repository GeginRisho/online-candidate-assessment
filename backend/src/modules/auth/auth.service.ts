import { AdminRole } from '@prisma/client';
import { prisma } from '@config/prisma';
import { logger } from '@config/logger';
import { env } from '@config/env';
import { hashPassword, comparePassword } from '@utils/password';
import { hashToken } from '@utils/hashToken';
import { generateCandidateCode } from '@utils/candidateCode';
import { generateQrCodeDataUrl } from '@utils/qrcode';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  UserRole,
} from '@utils/jwt';
import { ConflictError, ForbiddenError, UnauthorizedError, NotFoundError, BadRequestError } from '@utils/AppError';
import { v4 as uuidv4 } from 'uuid';
import type { AdminLoginInput, AdminRegisterInput } from './auth.validation';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/** Converts a duration string like "7d" / "15m" into milliseconds. */
function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 15 * 60 * 1000; // sane fallback: 15 minutes
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
}

async function issueTokenPair(
  userId: string,
  role: UserRole,
  email: string,
  meta: RequestMeta,
  adminRole?: AdminRole,
): Promise<TokenPair> {
  const tokenId = uuidv4();

  const accessToken = signAccessToken({ sub: userId, role, email, adminRole });
  const refreshToken = signRefreshToken({ sub: userId, role, tokenId });

  const refreshTokenExpiresAt = new Date(
    Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      adminId: role === 'ADMIN' ? userId : undefined,
      candidateId: role === 'CANDIDATE' ? userId : undefined,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

export async function adminLogin(input: AdminLoginInput, meta: RequestMeta) {
  const admin = await prisma.admin.findUnique({ where: { email: input.email } });

  if (!admin || !admin.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const validPassword = await comparePassword(input.password, admin.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await issueTokenPair(admin.id, 'ADMIN', admin.email, meta, admin.role);

  await prisma.$transaction([
    prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entity: 'ADMIN',
        entityId: admin.id,
        adminId: admin.id,
        description: `Admin ${admin.email} logged in`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    }),
  ]);

  return {
    tokens,
    user: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
    },
  };
}

export async function adminRegister(input: AdminRegisterInput, meta: RequestMeta) {
  const existing = await prisma.admin.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An admin account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const admin = await prisma.admin.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: `${input.fullName} (${input.organization})`,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const tokens = await issueTokenPair(admin.id, 'ADMIN', admin.email, meta, admin.role);

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'ADMIN',
      entityId: admin.id,
      adminId: admin.id,
      description: `Admin ${admin.email} registered from organization ${input.organization}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  logger.info({ adminId: admin.id }, 'New admin registered');

  return {
    tokens,
    user: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
    },
  };
}

// ---------------------------------------------------------------------------
// Candidate auth
// ---------------------------------------------------------------------------

export async function candidateRegister(input: any, meta: RequestMeta) {
  let examId = input.examId;

  if (!examId && input.examToken) {
    const exam = await prisma.exam.findUnique({
      where: { qrToken: input.examToken },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found for the provided QR link');
    }
    examId = exam.id;
  }

  if (!examId) {
    throw new BadRequestError('Exam ID or QR Link token is required to register');
  }

  // Verify that the exam exists
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  let candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { email: input.email },
        { phone: input.phone }
      ]
    }
  });

  if (candidate) {
    // Check if there is an existing session for this candidate and this exam
    const existingSession = await prisma.examSession.findUnique({
      where: { examId_candidateId: { examId, candidateId: candidate.id } },
    });

    if (existingSession) {
      const completedStatuses = ['SUBMITTED', 'AUTO_SUBMITTED', 'DISQUALIFIED', 'EXPIRED'];
      if (completedStatuses.includes(existingSession.status) || ['COMPLETED', 'DISQUALIFIED'].includes(candidate.status)) {
        throw new BadRequestError('You have already registered or completed this assessment. Multiple attempts are not allowed.');
      }
      if (candidate.status === 'REJECTED') {
        throw new BadRequestError('Your registration has been rejected by the administrator.');
      }
    }
    
    // Otherwise update their details and set status to WAITING_APPROVAL
    candidate = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        fullName: input.fullName,
        phone: input.phone || null,
        collegeName: input.collegeName || null,
        branch: input.branch || null,
        degree: input.degree || null,
        yearOfStudy: input.yearOfStudy || null,
        status: 'WAITING_APPROVAL',
      },
    });
  } else {
    const candidateCode = await generateCandidateCode();
    candidate = await prisma.candidate.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone || null,
        collegeName: input.collegeName || null,
        branch: input.branch || null,
        degree: input.degree || null,
        yearOfStudy: input.yearOfStudy || null,
        candidateCode,
        status: 'WAITING_APPROVAL',
      },
    });
  }

  // Find or create ExamSession in NOT_STARTED state
  let session = await prisma.examSession.findUnique({
    where: { examId_candidateId: { examId, candidateId: candidate.id } },
  });

  if (!session) {
    session = await prisma.examSession.create({
      data: {
        examId,
        candidateId: candidate.id,
        status: 'NOT_STARTED',
      },
    });
  } else {
    // Reset session status if they re-register or resume from waiting
    const keepSessionStatuses = ['SUBMITTED', 'AUTO_SUBMITTED', 'DISQUALIFIED', 'EXPIRED'];
    if (!keepSessionStatuses.includes(session.status)) {
      session = await prisma.examSession.update({
        where: { id: session.id },
        data: {
          status: 'NOT_STARTED',
          startedAt: null,
          endedAt: null,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'CANDIDATE',
      entityId: candidate.id,
      candidateId: candidate.id,
      description: `Candidate ${candidate.email} registered for exam ${examId}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  logger.info({ candidateId: candidate.id, examId }, 'Candidate registered successfully');

  return {
    sessionId: session.id,
    user: {
      id: candidate.id,
      email: candidate.email,
      fullName: candidate.fullName,
      candidateCode: candidate.candidateCode,
      status: candidate.status,
      phone: candidate.phone,
      collegeName: candidate.collegeName,
      degree: candidate.degree,
      branch: candidate.branch,
      yearOfStudy: candidate.yearOfStudy,
    },
  };
}



// ---------------------------------------------------------------------------
// QR Registration
// ---------------------------------------------------------------------------

/**
 * Generates a QR code that deep-links to the candidate registration page.
 * Optionally scoped to a specific exam via `examId` so posters at different
 * recruitment drives route candidates into the right context.
 */
export async function generateQrRegistration(examId?: string) {
  if (examId) {
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true, title: true } });
    if (!exam) throw new NotFoundError('Exam not found');
  }

  const qrRef = uuidv4();
  const registrationUrl = new URL('/register', env.CLIENT_URL);
  registrationUrl.searchParams.set('ref', qrRef);
  if (examId) registrationUrl.searchParams.set('examId', examId);

  const qrCodeDataUrl = await generateQrCodeDataUrl(registrationUrl.toString());

  return {
    registrationUrl: registrationUrl.toString(),
    qrCodeDataUrl,
    qrRef,
  };
}

// ---------------------------------------------------------------------------
// Refresh token rotation
// ---------------------------------------------------------------------------

export async function rotateRefreshToken(rawRefreshToken: string, meta: RequestMeta) {
  const payload = verifyRefreshToken(rawRefreshToken);
  const incomingHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: incomingHash } });

  if (!stored) {
    // Token not recognized at all — could be forged; nothing further to revoke.
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (stored.revokedAt || stored.expiresAt < new Date()) {
    // Reuse of an already-rotated (or expired) token strongly suggests theft.
    // Revoke every outstanding token for this user as a precaution.
    if (payload.role === 'ADMIN') {
      await prisma.refreshToken.updateMany({
        where: { adminId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { candidateId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    logger.warn({ userId: payload.sub, role: payload.role }, 'Refresh token reuse detected — all sessions revoked');
    throw new UnauthorizedError('Session expired. Please log in again.');
  }

  // Valid, single-use token — rotate it.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  let email: string;
  let adminRole: AdminRole | undefined;

  if (payload.role === 'ADMIN') {
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) throw new UnauthorizedError('Account no longer active');
    email = admin.email;
    adminRole = admin.role;
  } else {
    const candidate = await prisma.candidate.findUnique({ where: { id: payload.sub } });
    if (!candidate) throw new UnauthorizedError('Account not found');
    if (candidate.status === 'DISQUALIFIED') throw new ForbiddenError('Account disqualified');
    email = candidate.email;
  }

  const tokens = await issueTokenPair(payload.sub, payload.role, email, meta, adminRole);

  return { tokens, role: payload.role };
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  const incomingHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: incomingHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Current user profile ("/me")
// ---------------------------------------------------------------------------

export async function getCurrentUser(userId: string, role: UserRole) {
  if (role === 'ADMIN') {
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, lastLoginAt: true },
    });
    if (!admin) throw new NotFoundError('Admin not found');
    return { ...admin, userType: 'ADMIN' as const };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      candidateCode: true,
      status: true,
      collegeName: true,
      degree: true,
      branch: true,
      graduationYear: true,
      photoUrl: true,
      systemCheckPassed: true,
    },
  });
  if (!candidate) throw new NotFoundError('Candidate not found');
  return { ...candidate, userType: 'CANDIDATE' as const };
}
