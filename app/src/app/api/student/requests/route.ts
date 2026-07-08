import { withRoute } from '@/server/http/route';
import { getProgramRequests } from '@/server/container';
import { createProgramRequestSchema } from '@/server/program-requests/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user }) => getProgramRequests().listForStudent(user.id),
  { role: 'STUDENT' },
);

export const POST = withRoute(
  ({ user, body }) => getProgramRequests().create(user.id, body),
  { role: 'STUDENT', bodySchema: createProgramRequestSchema },
);
