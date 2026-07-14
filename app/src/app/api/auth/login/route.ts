import type { NextRequest } from 'next/server';
import { ok, mapError } from '@/server/http/envelope';
import { clientIp, rateLimit } from '@/server/http/rate-limit';
import { getAuth, getTokens } from '@/server/container';
import { passwordLoginSchema } from '@/server/auth/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Password sign-in for an existing account. */
export async function POST(req: NextRequest) {
  try {
    // Tighter than OTP: this is the endpoint someone would brute-force.
    await rateLimit(`auth-login:${clientIp(req)}`, 10, 60);
    const { identifier, password } = passwordLoginSchema.parse(await req.json());
    const result = await getAuth().loginWithPassword(
      identifier,
      password,
      req.headers.get('user-agent') ?? undefined,
    );
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
