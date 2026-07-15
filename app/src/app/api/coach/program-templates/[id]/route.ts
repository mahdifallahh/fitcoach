import { withRoute } from '@/server/http/route';
import { getProgramTemplates } from '@/server/container';
import { updateTemplateSchema } from '@/server/program-templates/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, params }) => getProgramTemplates().get(user.id, params.id),
  { role: 'COACH' },
);

export const PATCH = withRoute(
  ({ user, params, body }) => getProgramTemplates().update(user.id, params.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: updateTemplateSchema },
);

export const DELETE = withRoute(
  ({ user, params }) => getProgramTemplates().remove(user.id, params.id),
  { role: 'COACH', requiresSub: true },
);
