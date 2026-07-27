import express, { Application } from 'express';
import { execSync } from 'child_process';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { generalRateLimiter } from '@middleware/rateLimiter';
import { errorHandler, notFoundHandler } from '@middleware/errorHandler';
import { apiRouter } from '@routes/index';
import bcrypt from 'bcryptjs';
import { prisma } from '@config/prisma';
import { ensureSuperAdmin } from '@utils/seedAdmin';

export function createApp(): Application {
  const app = express();

  // Trust first proxy (Nginx) so req.ip / secure cookies work correctly
  app.set('trust proxy', 1);

  // --- Security headers -----------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = (env.CLIENT_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const isOriginAllowed = (origin: string): boolean => {
    const cleanOrigin = origin.trim().replace(/\/$/, '');
    
    // Allow localhost:3000 and localhost:5173
    if (/^https?:\/\/localhost:(3000|5173)$/.test(cleanOrigin)) {
      return true;
    }
    
    // Allow any .vercel.app origin (including subdomains/preview urls)
    if (/^https:\/\/[a-zA-Z0-9-._]+\.vercel\.app$/.test(cleanOrigin)) {
      return true;
    }
    
    // Allow origins listed in CLIENT_URL env variable
    if (allowedOrigins.includes(cleanOrigin)) {
      return true;
    }
    
    return false;
  };

  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        // Do NOT throw error to prevent app crash/noise, just callback with false
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(corsMiddleware);
  app.options('*', corsMiddleware);


  // --- Body / cookie parsing ----------------------------------------------
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // --- Hardening -----------------------------------------------------------
  app.use(hpp()); // protect against HTTP parameter pollution
  app.use(compression());

  // --- Request logging -------------------------------------------------------
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      customProps: (req) => ({
        userId: req.user?.id,
      }),
    }),
  );

  // --- Rate limiting (general) ----------------------------------------------
  app.use(env.API_PREFIX, generalRateLimiter);

  // --- Health check ----------------------------------------------------------
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- System ops (migrate + seed) — protected by secret header -------------
  app.post('/sys/migrate', async (req, res) => {
    // Accept: SEED_SECRET env var, SEED_ADMIN_PASSWORD env var, or one-time bootstrap secret
    const secret = process.env.SEED_SECRET
      || process.env.SEED_ADMIN_PASSWORD
      || 'render-migrate-2026';
    const provided = req.headers['x-seed-secret'];
    if (provided !== secret) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    try {
      logger.info('🔄 [/sys/migrate] Running prisma migrate deploy...');
      const output = execSync('node_modules/.bin/prisma migrate deploy', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      logger.info('✅ [/sys/migrate] Migrations applied');
      await ensureSuperAdmin();
      res.json({ success: true, message: 'Migrations applied + admin seeded', output });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error({ err }, '❌ [/sys/migrate] Failed');
      res.status(500).json({ success: false, message: error });
    }
  });

  // --- Debug login — exposes real error, protected by same secret -----------
  app.post('/sys/debug-login', async (req, res) => {
    const secret = process.env.SEED_SECRET
      || process.env.SEED_ADMIN_PASSWORD
      || 'render-migrate-2026';
    const provided = req.headers['x-seed-secret'];
    if (provided !== secret) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    try {
      // Use static prisma import
      const email = 'superadmin@assessment.local';
      const password = 'ChangeMe123!';
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) {
        res.json({ found: false, email, message: 'Admin not found in DB' });
        return;
      }
      const valid = await bcrypt.compare(password, admin.passwordHash);
      res.json({
        found: true,
        email: admin.email,
        isActive: admin.isActive,
        role: admin.role,
        hashPrefix: admin.passwordHash.slice(0, 10),
        passwordValid: valid,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          JWT_ACCESS_SECRET_SET: !!process.env.JWT_ACCESS_SECRET,
          JWT_REFRESH_SECRET_SET: !!process.env.JWT_REFRESH_SECRET,
          DATABASE_URL_SET: !!process.env.DATABASE_URL,
        },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      res.status(500).json({ success: false, error: errMsg, stack: errStack });
    }
  });

  // --- API routes --------------------------------------------------------
  app.use(env.API_PREFIX, apiRouter);
  app.use('/', apiRouter);

  // --- 404 + error handling (must be last) ------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
