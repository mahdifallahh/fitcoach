import { withRoute } from '@/server/http/route';
import { getPrograms } from '@/server/container';
import { setStatusSchema } from '@/server/programs/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withRoute(
  ({ user, params, body }) => getPrograms().setStatus(user.id, params.id, body.status),
  { role: 'COACH', requiresSub: true, bodySchema: setStatusSchema },
);
