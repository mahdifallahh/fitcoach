import { ok } from '@/server/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness endpoint used by the container healthcheck (no DB dependency). */
export function GET() {
  return ok({ status: 'ok', timestamp: new Date().toISOString() });
}
