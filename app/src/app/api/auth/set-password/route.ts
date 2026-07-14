import { withRoute } from '@/server/http/route';
import { getAuth } from '@/server/container';
import { setPasswordSchema } from '@/server/auth/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Set/change the password for the signed-in user (used right after OTP signup). */
export const POST = withRoute(
  ({ user, body }) => getAuth().setPassword(user.id, body.password),
  { bodySchema: setPasswordSchema },
);
