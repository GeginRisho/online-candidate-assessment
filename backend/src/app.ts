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

  // --- CORS --------------------------------------------------------------
  const allowedOrigins = env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''));
  const fallbacks = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://online-candidate-assessment.vercel.app'
  ];
  fallbacks.forEach((url) => {
    if (!allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });

  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/$/, '');
      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
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

  // --- 404 + error handling (must be last) ------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
