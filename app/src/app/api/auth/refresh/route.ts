import type { NextRequest } from 'next/server';
import { ok, mapError } from '@/server/http/envelope';
import { getAuth, getTokens } from '@/server/container';
import { REFRESH_COOKIE } from '@/server/auth/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const raw = req.cookies.get(REFRESH_COOKIE)?.value;
    const result = await getAuth().refresh(raw, req.headers.get('user-agent') ?? undefined);
    const tokens = getTokens();
    return ok(
      { user: result.user },
      {
        cookies: [
          tokens.buildAccessCookie(result.accessToken),
          tokens.buildRefreshCookie(result.refreshToken),
        ],
      },
    );
  } catch (err) {
    return mapError(err);
  }
}
