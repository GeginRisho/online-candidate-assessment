import { Router } from 'express';
import { validate } from '@middleware/validate';
import { requireAuth } from '@middleware/auth';
import { authRateLimiter, generalRateLimiter } from '@middleware/rateLimiter';
import {
  adminLoginSchema,
  adminRegisterSchema,
  candidateRegisterSchema,
  candidateLoginSchema,
  qrRegistrationQuerySchema,
  refreshTokenSchema,
} from './auth.validation';
import * as authController from './auth.controller';

export const authRouter = Router();

// --- Admin -------------------------------------------------------------
authRouter.post(
  '/admin/login',
  authRateLimiter,
  validate(adminLoginSchema),
  authController.adminLogin,
);

authRouter.post(
  '/admin/register',
  authRateLimiter,
  validate(adminRegisterSchema),
  authController.adminRegister,
);


// --- Candidate -----------------------------------------------------------
authRouter.post(
  '/candidate/register',
  authRateLimiter,
  validate(candidateRegisterSchema),
  authController.candidateRegister,
);

authRouter.post(
  '/candidate/login',
  authRateLimiter,
  validate(candidateLoginSchema),
  authController.candidateLogin,
);

authRouter.get(
  '/candidate/qr',
  generalRateLimiter,
  validate(qrRegistrationQuerySchema),
  authController.getQrRegistration,
);

// --- Shared ------------------------------------------------------------
authRouter.post('/refresh', validate(refreshTokenSchema), authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
