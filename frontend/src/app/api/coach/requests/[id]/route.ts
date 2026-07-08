import { withRoute } from '@/server/http/route';
import { getProgramRequests } from '@/server/container';
import { updateRequestStatusSchema } from '@/server/program-requests/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withRoute(
  ({ user, params, body }) => getProgramRequests().updateStatus(user.id, params.id, body),
  { role: 'COACH', bodySchema: updateRequestStatusSchema },
);
