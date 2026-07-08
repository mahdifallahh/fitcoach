import { withRoute } from '@/server/http/route';
import { getExercises } from '@/server/container';
import { updateExerciseSchema } from '@/server/exercises/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, params }) => getExercises().get(user.id, params.id),
  { role: 'COACH' },
);

export const PATCH = withRoute(
  ({ user, params, body }) => getExercises().update(user.id, params.id, body),
  { role: 'COACH', requiresSub: true, bodySchema: updateExerciseSchema },
);

export const DELETE = withRoute(
  ({ user, params }) => getExercises().remove(user.id, params.id),
  { role: 'COACH', requiresSub: true },
);
