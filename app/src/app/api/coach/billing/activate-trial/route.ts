import { withRoute } from '@/server/http/route';
import { getSubscriptions } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Coach-initiated, one-time free trial (no subscription is created at signup). */
export const POST = withRoute(
  ({ user }) => getSubscriptions().activateTrial(user.id),
  { role: 'COACH' },
);
