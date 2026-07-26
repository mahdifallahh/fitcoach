import { withRoute } from '@/server/http/route';
import { getExercises } from '@/server/container';
import { pageQuery } from '@/server/http/pagination';
import { createExerciseSchema } from '@/server/exercises/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, req }) => {
    const sp = new URL(req.url).searchParams;
    return getExercises().list(user.id, {
      search: sp.get('search') ?? undefined,
      categoryId: sp.get('categoryId') ?? undefined,
      ...pageQuery(req),
    });
  },
  { role: 'COACH' },
);

export const POST = withRoute(
  ({ user, body }) => getExercises().create(user.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: createExerciseSchema },
);
