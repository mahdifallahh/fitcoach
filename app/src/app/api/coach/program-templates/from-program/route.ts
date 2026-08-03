import { withRoute } from '@/server/http/route';
import { getProgramTemplates } from '@/server/container';
import { templateFromProgramSchema } from '@/server/program-templates/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Save a program the coach already wrote as a reusable template. */
export const POST = withRoute(
  ({ user, body }) =>
    getProgramTemplates().createFromProgram(user.id, body.programId, body.name),
  { role: 'COACH', requiresSub: true, bodySchema: templateFromProgramSchema },
);
