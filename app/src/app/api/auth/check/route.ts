import type { NextRequest } from 'next/server';
import { ok, mapError } from '@/server/http/envelope';
import { clientIp, rateLimit } from '@/server/http/rate-limit';
import { getAuth } from '@/server/container';
import { checkIdentifierSchema } from '@/server/auth/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Does this phone have an account (and a password)? Drives the login form's next step. */
export async function POST(req: NextRequest) {
  try {
    await rateLimit(`auth-check:${clientIp(req)}`, 20, 60);
    const { identifier } = checkIdentifierSchema.parse(await req.json());
    return ok(await getAuth().checkIdentifier(identifier));
  } catch (err) {
    return mapError(err);
  }
}
