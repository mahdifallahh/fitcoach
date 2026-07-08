import { withRoute } from '@/server/http/route';
import { getCoachProfile } from '@/server/container';
import { imageUploadSchema } from '@/server/http/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  ({ user, body }) => getCoachProfile().avatarUploadUrl(user.id, body.contentType),
  { role: 'COACH', bodySchema: imageUploadSchema },
);
