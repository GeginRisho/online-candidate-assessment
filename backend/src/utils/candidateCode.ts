import { prisma } from '@config/prisma';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Generates a unique, human-friendly candidate code, e.g. CAND-2026-K7QX9M.
 * Retries on the rare collision instead of relying on randomness alone.
 */
export async function generateCandidateCode(): Promise<string> {
  const year = new Date().getFullYear();
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = `CAND-${year}-${randomSegment(6)}`;
    const existing = await prisma.candidate.findUnique({
      where: { candidateCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error('Failed to generate a unique candidate code after multiple attempts');
}
