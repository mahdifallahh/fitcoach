import "server-only";
import {
  PaymentGateway,
  PaymentStatus,
  Prisma,
  SubscriptionPlan,
  type PrismaClient,
} from "@prisma/client";
import { AppConfig } from "../config";
import { SubscriptionsService } from "../subscriptions/service";
import { PLANS } from "../subscriptions/plans";
import { BadRequestException, NotFoundException } from "../http/errors";
import { ZarinpalProvider } from "./providers/zarinpal";
import { StripeProvider } from "./providers/stripe";
import type { SubscriptionGateway } from "./gateways";

export class PaymentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly subscriptions: SubscriptionsService,
    private readonly zarinpal: ZarinpalProvider,
    private readonly stripe: StripeProvider,
  ) {}

  /** Billing summary for the coach panel: current sub, plan catalog, history. */
  async getBilling(coachId: string) {
    const [subscription, payments] = await Promise.all([
      this.subscriptions.getCurrent(coachId),
      this.prisma.payment.findMany({
        where: { coachId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const plans = (Object.keys(PLANS) as SubscriptionPlan[]).map((id) => ({
      id,
      months: PLANS[id].months,
      priceIrr: PLANS[id].priceIrr,
      priceUsd: PLANS[id].priceUsd,
    }));
    return {
      subscription,
      plans,
      payments,
      simulateMode: !this.gatewayConfigured(),
    };
  }

  /** Start checkout → returns a redirect URL (real gateway, or dev simulate page). */
  async createCheckout(
    coachId: string,
    plan: SubscriptionPlan,
    gateway: SubscriptionGateway,
    locale: string,
  ) {
    if (!PLANS[plan])
      throw new BadRequestException({
        code: "BAD_PLAN",
        message: "Unknown plan",
      });
    const { amount, currency } = this.amountFor(plan);

    const payment = await this.prisma.payment.create({
      data: {
        coachId,
        plan,
        gateway,
        amount,
        currency,
        status: PaymentStatus.PENDING,
      },
    });

    const provider = this.zarinpal;
    const appUrl = this.config.get("APP_PUBLIC_URL");

    // No gateway credentials in dev → route to the in-app simulate flow.
    if (!provider.configured) {
      const reference = `dev_${payment.id}`;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { reference },
      });
      return {
        redirectUrl: `${appUrl}/${locale}/coach/billing?simulate=${payment.id}`,
      };
    }

    // The API is same-origin, so the ZarinPal callback lives under /api on the app.
    const callbackUrl = `${appUrl}/api/coach/billing/zarinpal/callback?locale=${locale}`;

    const result = await provider.createCheckout({
      paymentId: payment.id,
      plan,
      amount,
      currency,
      description: `fitlo ${plan} subscription`,
      callbackUrl,
    });
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { reference: result.reference },
    });
    return { redirectUrl: result.redirectUrl };
  }

  /** DEV ONLY: simulate a successful gateway payment to exercise activation + gating. */
  async devComplete(coachId: string, paymentId: string) {
    if (this.config.isProduction) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Not found" });
    }
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, coachId },
    });
    if (!payment)
      throw new NotFoundException({
        code: "PAYMENT_NOT_FOUND",
        message: "Payment not found",
      });
    await this.markPaidAndActivate(payment, { simulated: true });
    return this.subscriptions.getCurrent(coachId);
  }

  /** ZarinPal redirect callback → verify server-side, then bounce to the app. */
  async handleZarinpalCallback(
    authority: string,
    status: string,
    locale: string,
  ): Promise<string> {
    const app = `${this.config.get("APP_PUBLIC_URL")}/${locale}/coach/billing`;
    const payment = await this.prisma.payment.findFirst({
      where: { gateway: PaymentGateway.ZARINPAL, reference: authority },
    });
    if (!payment) return `${app}?status=failed`;
    if (status !== "OK") {
      await this.fail(payment.id);
      return `${app}?status=cancel`;
    }
    const verification = await this.zarinpal.verify(authority, payment.amount);
    if (!verification.success) {
      await this.fail(payment.id);
      return `${app}?status=failed`;
    }
    await this.markPaidAndActivate(payment, verification.raw);
    return `${app}?status=success`;
  }

  /** Stripe webhook → activate on checkout.session.completed. */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructEvent(rawBody, signature);
    if (event.type !== "checkout.session.completed") return;
    const session = event.data.object as { metadata?: { paymentId?: string } };
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) return;
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId },
    });
    if (payment)
      await this.markPaidAndActivate(
        payment,
        event as unknown as Prisma.InputJsonValue,
      );
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  /** ZarinPal is the only checkout gateway today, so amounts are always in Rial. */
  private amountFor(plan: SubscriptionPlan) {
    const p = PLANS[plan];
    return { amount: p.priceIrr * 10, currency: "IRR" }; // Toman → Rial
  }

  /** Idempotent: marks PENDING→PAID once, then activates/extends the plan. */
  private async markPaidAndActivate(
    payment: { id: string; coachId: string; plan: SubscriptionPlan },
    raw: unknown,
  ) {
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.PAID,
        raw: (raw ?? {}) as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) return; // already processed → no double activation
    const sub = await this.subscriptions.activateOrExtend(
      payment.coachId,
      payment.plan,
    );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: sub.id },
    });
    console.log(
      `[payments] ${payment.id} paid → subscription ${sub.id} active until ${sub.endsAt?.toISOString() ?? "∞"}`,
    );
  }

  private fail(paymentId: string) {
    return this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED },
    });
  }

  /** ZarinPal alone decides "real money" vs. the in-app simulate flow. */
  private gatewayConfigured(): boolean {
    return this.zarinpal.configured;
  }
}
