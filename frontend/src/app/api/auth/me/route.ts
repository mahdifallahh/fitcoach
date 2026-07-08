import { withRoute } from '@/server/http/route';
import { getAuth } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(async ({ user }) => getAuth().me(user.id));
