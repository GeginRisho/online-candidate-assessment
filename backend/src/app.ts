import express, { Application } from 'express';
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

  // --- API routes --------------------------------------------------------
  app.use(env.API_PREFIX, apiRouter);
  app.use('/', apiRouter);

  // --- 404 + error handling (must be last) ------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
