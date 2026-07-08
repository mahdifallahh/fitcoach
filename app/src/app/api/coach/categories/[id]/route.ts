import { withRoute } from '@/server/http/route';
import { getCategories } from '@/server/container';
import { categoryNameSchema } from '@/server/categories/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withRoute(
  ({ user, params, body }) => getCategories().rename(user.id, params.id, body.name),
  { role: 'COACH', requiresSub: true, bodySchema: categoryNameSchema },
);

export const DELETE = withRoute(
  ({ user, params }) => getCategories().remove(user.id, params.id),
  { role: 'COACH', requiresSub: true },
);
