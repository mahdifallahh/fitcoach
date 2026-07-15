import { withRoute } from '@/server/http/route';
import { getProgramTemplates } from '@/server/container';
import { assignTemplateSchema } from '@/server/program-templates/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Materialize a real Program for a student from this template.
export const POST = withRoute(
  ({ user, params, body }) => getProgramTemplates().assign(user.id, params.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: assignTemplateSchema },
);
