import "server-only";
import {
  SubscriptionStatus,
  SubscriptionTier,
  type PrismaClient,
  type SubscriptionPlan,
} from "@prisma/client";
import { PLANS, TIER_MAX_STUDENTS, addMonths } from "./plans";

export class SubscriptionsService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Current subscription row for a coach (one per coach in the tier model). */
  getCurrent(coachId: string) {
    return this.prisma.subscription.findFirst({
      where: { coachId },
      orderBy: { createdAt: "desc" }, // endsAt is nullable now; order by creation
    });
  }

  /**
   * Idempotently ensure the coach has a subscription. Every coach is at least on
   * the permanent FREE tier; this creates that row if it's missing (new coaches
   * get it at signup, existing ones via the tier migration, so this is mostly a
   * safety net). Replaces the old one-time 15-day `activateTrial`.
   */
  async ensureFreePlan(coachId: string) {
    const current = await this.getCurrent(coachId);
    if (current) return current;
    return this.prisma.subscription.create({
      data: {
        coachId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        endsAt: null, // FREE never expires
      },
    });
  }

  /** How many students a coach's tier allows (null = unlimited). */
  async maxStudents(coachId: string): Promise<number | null> {
    const sub = await this.getCurrent(coachId);
    const tier = sub?.tier ?? SubscriptionTier.FREE;
    return TIER_MAX_STUDENTS[tier];
  }

  /**
   * True while the coach may create/edit. Tier-based rows (FREE + paid) have a
   * null `endsAt` and are live whenever ACTIVE. Legacy time-based rows (a paid
   * plan with an `endsAt`) stay live only until that date. A coach with no row
   * at all is treated as FREE-active (the migration backfills rows, but this
   * keeps the guard safe if one is ever missing).
   */
  async isActive(coachId: string): Promise<boolean> {
    const sub = await this.getCurrent(coachId);
    if (!sub) return true; // implicit FREE
    const live =
      sub.status === SubscriptionStatus.ACTIVE ||
      sub.status === SubscriptionStatus.TRIALING;
    if (!live) return false;
    // Tier-based (never-expiring) rows have endsAt === null → always live.
    return sub.endsAt === null || sub.endsAt.getTime() > Date.now();
  }

  /**
   * Activate or extend a legacy paid (time-based) plan. Unused while paid pricing
   * is "coming soon", but kept wired for when checkout goes live. Extends from the
   * later of now / current end so paying before expiry stacks.
   */
  async activateOrExtend(coachId: string, plan: SubscriptionPlan) {
    const current = await this.getCurrent(coachId);
    const now = new Date();
    const base =
      current && current.endsAt && current.endsAt > now ? current.endsAt : now;
    const endsAt = addMonths(base, PLANS[plan].months);

    if (current) {
      return this.prisma.subscription.update({
        where: { id: current.id },
        data: { status: SubscriptionStatus.ACTIVE, plan, endsAt },
      });
    }
    return this.prisma.subscription.create({
      data: { coachId, plan, status: SubscriptionStatus.ACTIVE, startsAt: now, endsAt },
    });
  }

  /**
   * Sweep overdue time-based (paid) plans → EXPIRED. Never touches tier rows,
   * which have a null `endsAt` (excluded by the `lt` comparison).
   */
  async expireDue(): Promise<number> {
    const { count } = await this.prisma.subscription.updateMany({
      where: {
        status: {
          in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE],
        },
        endsAt: { lt: new Date() },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    return count;
  }
}
