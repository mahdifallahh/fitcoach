import { withRoute } from '@/server/http/route';
import { getStudents } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every student this coach has written for, newest activity first. */
export const GET = withRoute(({ user }) => getStudents().list(user.id), {
  role: 'COACH',
});
