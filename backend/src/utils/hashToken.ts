import { createHash } from 'crypto';

/**
 * Refresh tokens are stored in the database as a SHA-256 digest, never in
 * raw form. This means a database leak alone cannot be used to forge a
 * session — the attacker would still need the original signed JWT (which
 * only ever lives in the httpOnly cookie / client memory).
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
