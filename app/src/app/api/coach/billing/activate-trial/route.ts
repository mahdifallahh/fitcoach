import { withRoute } from '@/server/http/route';
import { getSubscriptions } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ensure the coach is on the permanent FREE plan (idempotent). Coaches are
 * provisioned with FREE at signup; this is a safety net that returns the existing
 * row or creates a FREE one. (Path kept for compatibility — no more 15-day trial.)
 */
export const POST = withRoute(
  ({ user }) => getSubscriptions().ensureFreePlan(user.id),
  { role: 'COACH' },
);
