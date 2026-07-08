import { withRoute } from '@/server/http/route';
import { getPayments } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(({ user }) => getPayments().getBilling(user.id), { role: 'COACH' });
