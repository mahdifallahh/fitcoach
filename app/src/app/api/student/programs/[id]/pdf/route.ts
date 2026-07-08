import { withRoute } from '@/server/http/route';
import { getPdf } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  ({ user, params, req }) => {
    const locale = new URL(req.url).searchParams.get('locale') === 'en' ? 'en' : 'fa';
    return getPdf().getOrGenerateForStudent(user.id, params.id, locale);
  },
  { role: 'STUDENT' },
);
