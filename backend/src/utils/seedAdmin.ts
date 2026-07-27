import { prisma } from '@config/prisma';
import { logger } from '@config/logger';
import { env } from '@config/env';
import { hashPassword } from '@utils/password';

/**
 * Ensures the superadmin account exists in the database.
 * Reads credentials from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
 * Safe to run on every startup — uses upsert so it never duplicates.
 */
export async function ensureSuperAdmin(): Promise<void> {
  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    logger.info('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  try {
    const existing = await prisma.admin.findUnique({ where: { email } });

    if (existing) {
      logger.info(`✅ Superadmin already exists: ${email}`);
      return;
    }

    const passwordHash = await hashPassword(password);

    await prisma.admin.create({
      data: {
        email,
        passwordHash,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    logger.info(`✅ Superadmin seeded: ${email}`);
  } catch (err) {
    logger.error({ err }, '❌ Failed to seed superadmin');
  }
}
