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

/**
 * Capability tiers. Access is scoped by how many students a coach may manage —
 * NOT by time. This map is the single source of truth for the student cap and
 * mirrors the Prisma `SubscriptionTier` enum; the server imports it too (for the
 * quota check) so client and server never drift. `null` = unlimited.
 *
 * A coach may write unlimited programs per student on every tier; the cap is on
 * the number of distinct students.
 */
export type TierCode = 'FREE' | 'ECONOMY' | 'NORMAL' | 'PRO';

export const TIER_MAX_STUDENTS: Record<TierCode, number | null> = {
  FREE: 1,
  ECONOMY: 10,
  NORMAL: 25,
  PRO: null,
};

/** The default tier every coach starts on (permanent, free). */
export const DEFAULT_TIER: TierCode = 'FREE';

/**
 * Paid upgrade tiers shown on the marketing + billing pricing grids. FREE is the
 * default plan (not an upsell card), so it's excluded here. Pricing is **not set
 * yet** (rendered as "coming soon"); the checkout wiring (PUBLIC_PLANS / server
 * PLANS) stays put for when prices land. `highlight` marks the recommended tier.
 */
export type PaidTierCode = Exclude<TierCode, 'FREE'>;

export const TIERS: { code: PaidTierCode; maxStudents: number | null; highlight?: boolean }[] = [
  { code: 'ECONOMY', maxStudents: TIER_MAX_STUDENTS.ECONOMY },
  { code: 'NORMAL', maxStudents: TIER_MAX_STUDENTS.NORMAL, highlight: true },
  { code: 'PRO', maxStudents: TIER_MAX_STUDENTS.PRO },
];
