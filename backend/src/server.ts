import { createServer } from 'http';
import { execSync } from 'child_process';
import { env, isProduction } from '@config/env';
import { logger } from '@config/logger';
import { connectDatabase, disconnectDatabase } from '@config/prisma';
import { createApp } from './app';
import { initSocketServer } from '@sockets/index';
import { ensureSuperAdmin } from '@utils/seedAdmin';

async function bootstrap(): Promise<void> {
  // Auto-apply migrations in production (e.g. Render deployment)
  if (isProduction) {
    try {
      logger.info('🔄 Running prisma migrate deploy...');
      execSync('node_modules/.bin/prisma migrate deploy', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      logger.info('✅ Prisma migrations applied');
    } catch (err) {
      logger.error({ err }, '❌ Prisma migrate deploy failed — continuing anyway');
    }
  }

  await connectDatabase();
  await ensureSuperAdmin();

  const app = createApp();
  const httpServer = createServer(app);

  initSocketServer(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📡 API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('👋 Shutdown complete');
      process.exit(0);
    });

    // Force-exit if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception — shutting down');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
