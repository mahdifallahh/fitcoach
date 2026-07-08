import { withRoute } from '@/server/http/route';
import { getPayments } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  ({ user, params }) => getPayments().devComplete(user.id, params.paymentId),
  { role: 'COACH' },
);
