import { withRoute } from '@/server/http/route';
import { getPrograms } from '@/server/container';
import { updateProgramSchema } from '@/server/programs/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, params }) => getPrograms().get(user.id, params.id),
  { role: 'COACH' },
);

export const PATCH = withRoute(
  ({ user, params, body }) => getPrograms().update(user.id, params.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: updateProgramSchema },
);

export const DELETE = withRoute(
  ({ user, params }) => getPrograms().remove(user.id, params.id),
  { role: 'COACH', requiresSub: true },
);
