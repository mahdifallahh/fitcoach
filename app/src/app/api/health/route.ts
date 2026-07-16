import { ok } from '@/server/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness endpoint used by the container healthcheck (no DB dependency).
 * Also surfaces which OTP/SMS provider is live so a deploy can be verified from
 * outside without shell access — presence only, never the secret values.
 */
export function GET() {
  const smsProvider = process.env.SMS_PROVIDER === 'smsir' ? 'smsir' : 'mock';
  return ok({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
    sms: {
      provider: smsProvider,
      // smsir needs both an API key and a template id, or every OTP is dropped.
      configured:
        smsProvider === 'smsir'
          ? Boolean(process.env.SMSIR_API_KEY && process.env.SMSIR_TEMPLATE_ID)
          : true,
    },
  });
}
