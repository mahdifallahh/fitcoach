import type { NextRequest } from 'next/server';
import { ok, mapError } from '@/server/http/envelope';
import { getAuth, getTokens } from '@/server/container';
import { REFRESH_COOKIE } from '@/server/auth/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await getAuth().logout(req.cookies.get(REFRESH_COOKIE)?.value);
    return ok({ success: true }, { cookies: getTokens().clearCookies() });
  } catch (err) {
    return mapError(err);
  }
}
