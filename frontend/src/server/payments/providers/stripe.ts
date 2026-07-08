import 'server-only';
import Stripe from 'stripe';
import { PaymentGateway } from '@prisma/client';
import { AppConfig } from '../../config';
import type { CheckoutInput, CheckoutResult, PaymentProvider } from '../interface';

/** Stripe (international/USD) via Checkout Sessions; verification is webhook-driven. */
export class StripeProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.STRIPE;
  private readonly stripe: Stripe | null;

  constructor(private readonly config: AppConfig) {
    const key = this.config.get('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  get configured(): boolean {
    return !!this.stripe;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.stripe) throw new Error('Stripe is not configured');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${input.callbackUrl}?status=success&paymentId=${input.paymentId}`,
      cancel_url: `${input.callbackUrl}?status=cancel&paymentId=${input.paymentId}`,
      customer_email: input.coachEmail ?? undefined,
      client_reference_id: input.paymentId,
      metadata: { paymentId: input.paymentId, plan: input.plan },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: { name: input.description },
          },
        },
      ],
    });
    if (!session.url) throw new Error('Stripe session has no URL');
    return { redirectUrl: session.url, reference: session.id };
  }

  /** Verify + parse a webhook payload. */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new Error('Stripe is not configured');
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret ?? '');
  }
}
