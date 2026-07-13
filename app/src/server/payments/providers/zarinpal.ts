import "server-only";
import { PaymentGateway } from "@prisma/client";
import { AppConfig } from "../../config";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  VerifyResult,
} from "../interface";

/**
 * ZarinPal (IRR) via the v4 REST API. Sandbox vs production is env-driven.
 * Amounts are in Rial.
 */
export class ZarinpalProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.ZARINPAL;

  constructor(private readonly config: AppConfig) {}

  get configured(): boolean {
    return !!this.config.get("ZARINPAL_MERCHANT_ID");
  }

  private get base(): string {
    return this.config.get("ZARINPAL_SANDBOX")
      ? "https://sandbox.zarinpal.com"
      : "https://payment.zarinpal.com";
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const res = await fetch(`${this.base}/pg/v4/payment/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: this.config.get("ZARINPAL_MERCHANT_ID"),
        amount: input.amount,
        description: input.description,
        callback_url: input.callbackUrl,
        metadata: input.coachEmail ? { email: input.coachEmail } : undefined,
      }),
    });
    const json = (await res.json()) as {
      data?: { authority?: string };
      errors?: unknown;
    };
    const authority = json?.data?.authority;
    if (!authority) {
      console.error(
        `[zarinpal] request failed: ${JSON.stringify(json?.errors ?? json)}`,
      );
      throw new Error("ZarinPal payment request failed");
    }
    return {
      redirectUrl: `${this.base}/pg/StartPay/${authority}`,
      reference: authority,
    };
  }

  async verify(authority: string, amount: number): Promise<VerifyResult> {
    const res = await fetch(`${this.base}/pg/v4/payment/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: this.config.get("ZARINPAL_MERCHANT_ID"),
        amount,
        authority,
      }),
    });
    const json = (await res.json()) as { data?: { code?: number } };
    const code = json?.data?.code;
    return {
      success: code === 100 || code === 101,
      reference: authority,
      raw: json,
    };
  }
}
