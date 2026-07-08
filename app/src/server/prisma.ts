import 'server-only';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton. Guarded on `globalThis` so Next.js dev hot-reload doesn't
 * open a new pool of connections on every recompile.
 */
const g = globalThis as unknown as { __fitloPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!g.__fitloPrisma) {
    g.__fitloPrisma = new PrismaClient();
  }
  return g.__fitloPrisma;
}
