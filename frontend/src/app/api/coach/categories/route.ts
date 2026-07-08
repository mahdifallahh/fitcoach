import { withRoute } from '@/server/http/route';
import { getCategories } from '@/server/container';
import { categoryNameSchema } from '@/server/categories/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(({ user }) => getCategories().list(user.id), { role: 'COACH' });

export const POST = withRoute(
  ({ user, body }) => getCategories().create(user.id, body.name),
  { role: 'COACH', requiresSub: true, bodySchema: categoryNameSchema },
);
