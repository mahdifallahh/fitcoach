import { withRoute } from '@/server/http/route';
import { getProgramTemplates } from '@/server/container';
import { pageQuery } from '@/server/http/pagination';
import { createTemplateSchema } from '@/server/program-templates/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, req }) =>
    getProgramTemplates().list(user.id, {
      search: new URL(req.url).searchParams.get('search') ?? undefined,
      ...pageQuery(req),
    }),
  { role: 'COACH' },
);

export const POST = withRoute(
  ({ user, body }) => getProgramTemplates().create(user.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: createTemplateSchema },
);
