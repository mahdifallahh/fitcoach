/**
 * Public pricing catalog — safe to import from client components and marketing
 * pages. Mirrors `src/server/subscriptions/plans.ts` (the source of truth used
 * for actual checkout/billing); keep the two in sync if prices change.
 */
export type PlanCode = 'M3' | 'M6' | 'M12';

export const PUBLIC_PLANS: Record<PlanCode, { months: number; priceIrr: number }> = {
  M3: { months: 3, priceIrr: 990_000 },
  M6: { months: 6, priceIrr: 1_790_000 },
  M12: { months: 12, priceIrr: 2_990_000 },
};

export const TRIAL_DAYS = 15;

/**
 * Public, capability-based subscription tiers shown on marketing + billing.
 * Tiers are scoped by how many students a coach can manage; pricing is **not set
 * yet** (shown as "coming soon"), so these are display-only for now — the actual
 * checkout wiring (PUBLIC_PLANS / server PLANS) stays put for when prices land.
 * `maxStudents: null` = unlimited. `highlight` marks the recommended tier.
 */
export type TierCode = 'ECONOMY' | 'NORMAL' | 'PRO';

export const TIERS: { code: TierCode; maxStudents: number | null; highlight?: boolean }[] = [
  { code: 'ECONOMY', maxStudents: 10 },
  { code: 'NORMAL', maxStudents: 50, highlight: true },
  { code: 'PRO', maxStudents: null },
];
