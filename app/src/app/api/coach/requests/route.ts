import { withRoute } from '@/server/http/route';
import { getProgramRequests } from '@/server/container';
import { pageQuery } from '@/server/http/pagination';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, req }) => getProgramRequests().listForCoach(user.id, pageQuery(req)),
  { role: 'COACH' },
);
