import { withRoute } from '@/server/http/route';
import { getProgramRequests } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user }) => getProgramRequests().listForCoach(user.id),
  { role: 'COACH' },
);
