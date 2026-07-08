import { withRoute } from '@/server/http/route';
import { getStudents } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(({ user }) => getStudents().listCoaches(user.id), { role: 'STUDENT' });
