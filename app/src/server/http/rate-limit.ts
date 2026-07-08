import 'server-only';
import type { NextRequest } from 'next/server';
import { HttpException } from './errors';

/** Best-effort client IP for rate-limiting (proxied via x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * In-memory fixed-window limiter. Replaces the Nest `ThrottlerGuard` for the auth
 * OTP endpoints (the per-identifier 60s OTP cooldown still lives in otp.ts). Kept
 * process-local (no Redis) — the app runs as a single Node server. Guarded on
 * `globalThis` so dev hot-reload doesn't reset the counters.
 */
const g = globalThis as unknown as { __fitloRateStore?: Map<string, WindowState> };
const store = (g.__fitloRateStore ??= new Map<string, WindowState>());

export async function rateLimit(bucket: string, limit: number, windowSec: number): Promise<void> {
  const now = Date.now();
  const existing = store.get(bucket);

  if (!existing || existing.resetAt <= now) {
    // Opportunistically prune expired windows so the map can't grow unbounded.
    if (store.size > 500) {
      for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    }
    store.set(bucket, { count: 1, resetAt: now + windowSec * 1000 });
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    throw new HttpException(
      { code: 'RATE_LIMITED', message: 'Too many requests, please try again shortly' },
      429,
    );
  }
}
