import { withRoute } from '@/server/http/route';
import { getPublicCoach } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ params }) => getPublicCoach().getByHandle(params.handle),
  { public: true },
);
