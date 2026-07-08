import { withRoute } from '@/server/http/route';
import { getCoachProfile } from '@/server/container';
import { updateCoachProfileSchema } from '@/server/coach-profile/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(({ user }) => getCoachProfile().get(user.id), { role: 'COACH' });

export const PATCH = withRoute(
  ({ user, body }) => getCoachProfile().update(user.id, body),
  { role: 'COACH', bodySchema: updateCoachProfileSchema },
);
