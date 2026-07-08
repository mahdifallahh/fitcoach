import type { SubscriptionPlan } from '@prisma/client';

/** Plan catalog. Prices: IRR (Toman) for ZarinPal, USD for Stripe. */
export const PLANS: Record<SubscriptionPlan, { months: number; priceIrr: number; priceUsd: number }> = {
  M3: { months: 3, priceIrr: 990_000, priceUsd: 19 },
  M6: { months: 6, priceIrr: 1_790_000, priceUsd: 34 },
  M12: { months: 12, priceIrr: 2_990_000, priceUsd: 59 },
};

export const TRIAL_DAYS = 7;

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}
