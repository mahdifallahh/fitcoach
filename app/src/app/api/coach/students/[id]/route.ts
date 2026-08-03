import { withRoute } from '@/server/http/route';
import { getStudents } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One student's stats plus the full history of programs written for them. */
export const GET = withRoute(
  ({ user, params }) => getStudents().getForCoach(user.id, params.id),
  { role: 'COACH' },
);
