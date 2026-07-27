import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: isProduction
      ? [{ emit: 'event', level: 'error' }]
      : [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
  });

  client.$on('error' as never, (e: unknown) => logger.error({ e }, 'Prisma error event'));
  if (!isProduction) {
    client.$on('warn' as never, (e: unknown) => logger.warn({ e }, 'Prisma warn event'));
  }

  return client;
}

// Prevent creating multiple PrismaClient instances during dev hot-reload (tsx watch)
export const prisma = global.__prisma ?? createPrismaClient();

if (!isProduction) {
  global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('🔌 Database disconnected');
}
