import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, mapError } from '@/server/http/envelope';
import { clientIp, rateLimit } from '@/server/http/rate-limit';
import { getAuth, getTokens } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  identifier: z.string().min(1),
  code: z.string().min(1),
  role: z.enum(['COACH', 'STUDENT']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await rateLimit(`otp-verify:${clientIp(req)}`, 10, 60);
    const { identifier, code, role } = schema.parse(await req.json());
    const result = await getAuth().verifyOtp(
      identifier,
      code,
      role,
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
