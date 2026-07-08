import { type NextRequest, NextResponse } from 'next/server';
import { getPayments } from '@/server/container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook. Signature verification needs the exact raw request body, so we
 * read it with `req.text()` (Next never parses it for Route Handlers). Not
 * enveloped — Stripe only wants a 2xx.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature') ?? '';
  const raw = await req.text();
  try {
    await getPayments().handleStripeWebhook(Buffer.from(raw, 'utf8'), signature);
  } catch (err) {
    console.error('[stripe] webhook error:', (err as Error).message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  return NextResponse.json({ received: true });
}
