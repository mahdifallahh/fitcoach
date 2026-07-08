import { withRoute } from '@/server/http/route';
import { getPayments } from '@/server/container';
import { checkoutSchema } from '@/server/payments/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  ({ user, body }) => getPayments().createCheckout(user.id, body.plan, body.gateway, body.locale ?? 'fa'),
  { role: 'COACH', bodySchema: checkoutSchema },
);
