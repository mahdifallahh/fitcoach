import { withRoute } from '@/server/http/route';
import { getPrograms } from '@/server/container';
import { pageQuery } from '@/server/http/pagination';
import { createProgramSchema } from '@/server/programs/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(({ user, req }) => getPrograms().list(user.id, pageQuery(req)), {
  role: 'COACH',
});

export const POST = withRoute(
  ({ user, body }) => getPrograms().create(user.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: createProgramSchema },
);
