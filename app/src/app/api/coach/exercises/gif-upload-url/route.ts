import { withRoute } from '@/server/http/route';
import { getExercises } from '@/server/container';
import { imageUploadSchema } from '@/server/http/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  ({ user, body }) => getExercises().gifUploadUrl(user.id, body.contentType),
  { role: 'COACH', bodySchema: imageUploadSchema },
);
