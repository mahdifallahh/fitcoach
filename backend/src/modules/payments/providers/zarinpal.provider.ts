import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway } from '@prisma/client';
import { AppConfigService } from '../../../config/config.module';
import { CheckoutInput, CheckoutResult, PaymentProvider, VerifyResult } from '../payment-provider.interface';

/**
 * ZarinPal (IRR) via the v4 REST API. Sandbox vs production is env-driven.
 * Amounts are in Rial.
 */
@Injectable()
export class ZarinpalProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.ZARINPAL;
  private readonly logger = new Logger(ZarinpalProvider.name);

  constructor(private readonly config: AppConfigService) {}

  get configured(): boolean {
    return !!this.config.get('ZARINPAL_MERCHANT_ID');
  }

  private get base(): string {
    return this.config.get('ZARINPAL_SANDBOX')
      ? 'https://sandbox.zarinpal.com'
      : 'https://payment.zarinpal.com';
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const res = await fetch(`${this.base}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.config.get('ZARINPAL_MERCHANT_ID'),
        amount: input.amount,
        description: input.description,
        callback_url: input.callbackUrl,
        metadata: input.coachEmail ? { email: input.coachEmail } : undefined,
      }),
    });
    const json: any = await res.json();
    const authority = json?.data?.authority;
    if (!authority) {
      this.logger.error(`ZarinPal request failed: ${JSON.stringify(json?.errors ?? json)}`);
      throw new Error('ZarinPal payment request failed');
    }
    return { redirectUrl: `${this.base}/pg/StartPay/${authority}`, reference: authority };
  }

  async verify(authority: string, amount: number): Promise<VerifyResult> {
    const res = await fetch(`${this.base}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.config.get('ZARINPAL_MERCHANT_ID'),
        amount,
        authority,
      }),
    });
    const json: any = await res.json();
    const code = json?.data?.code;
    return { success: code === 100 || code === 101, reference: authority, raw: json };
  }
}
