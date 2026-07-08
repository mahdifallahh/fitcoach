import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, mapError } from '@/server/http/envelope';
import { clientIp, rateLimit } from '@/server/http/rate-limit';
import { getAuth } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ identifier: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    await rateLimit(`otp-request:${clientIp(req)}`, 5, 60);
    const { identifier } = schema.parse(await req.json());
    return ok(await getAuth().requestOtp(identifier));
  } catch (err) {
    return mapError(err);
  }
}
