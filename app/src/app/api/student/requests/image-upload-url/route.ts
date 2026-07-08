import { withRoute } from '@/server/http/route';
import { getProgramRequests } from '@/server/container';
import { imageUploadSchema } from '@/server/http/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  ({ user, body }) => getProgramRequests().imageUploadUrl(user.id, body.contentType),
  { role: 'STUDENT', bodySchema: imageUploadSchema },
);
