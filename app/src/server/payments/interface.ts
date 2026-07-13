import type { PaymentGateway, SubscriptionPlan } from "@prisma/client";

export interface CheckoutInput {
  paymentId: string;
  plan: SubscriptionPlan;
  amount: number; // minor units (Rial / cents)
  currency: string; // "IRR" | "USD"
  description: string;
  callbackUrl: string; // where the gateway returns the user
  coachEmail?: string | null;
}

export interface CheckoutResult {
  redirectUrl: string;
  reference: string; // ZarinPal authority / Stripe session id
}

export interface VerifyResult {
  success: boolean;
  reference: string;
  raw?: unknown;
}

/** Common contract so both gateways plug into the same subscription flow. */
export interface PaymentProvider {
  readonly gateway: PaymentGateway;
  /** False when env credentials are absent (dev → simulate flow is used instead). */
  readonly configured: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
