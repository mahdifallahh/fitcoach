import "server-only";
import {
  Prisma,
  SubscriptionStatus,
  SubscriptionTier,
  type PrismaClient,
  type SubscriptionPlan,
} from "@prisma/client";
import { HttpException } from "../http/errors";
import { PLANS, TIER_MAX_STUDENTS, addMonths } from "./plans";

/**
 * A student stops counting once the coach has not touched their program for this
 * long. Long enough to cover a coach who writes monthly and then takes a break;
 * short enough that a finished client releases capacity on their own.
 *
 * Validate before trusting it: once the cap is live, look at the real spread of
 * "days between two programs for the same student" and move this to match.
 */
export const QUOTA_WINDOW_DAYS = 90;

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
   * Students that count against the tier cap: the distinct people this coach has
   * written or revised a program for inside the window.
   *
   * The unit is deliberately *not* "rows in StudentProfile". Two reasons, and
   * both are load-bearing:
   *
   *  - A profile is also born when a stranger submits an intake request from the
   *    coach's public page. Counting those would let anyone exhaust a coach's
   *    quota from outside — a denial of service against a paying customer.
   *  - A live row count is trivially reset: write the program, export the PDF,
   *    delete the student, repeat. Counting *authorship inside a window* instead
   *    means the only way to lower the number is to genuinely stop coaching that
   *    person, and capacity then frees itself with no support ticket.
   */
  countBillableStudents(
    coachId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
    windowDays = QUOTA_WINDOW_DAYS,
  ): Promise<number> {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    return tx.program
      .findMany({
        where: { coachId, updatedAt: { gte: since } },
        select: { studentProfileId: true },
        distinct: ["studentProfileId"],
      })
      .then((rows) => rows.length);
  }

  /**
   * Gate one more student onto the coach's tier. Call inside the transaction
   * that creates the program, *before* creating it.
   *
   * `studentProfileId` is the student about to be written for: if they are
   * already inside the window they cost nothing, so a coach at their cap can
   * always keep working with the people they already have. Only reaching for
   * someone new is refused.
   */
  async assertCanAddStudent(
    coachId: string,
    studentProfileId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const max = await this.maxStudentsWithin(coachId, tx);
    if (max === null) return; // unlimited tier

    // Serialize concurrent creates for this coach. Without it two requests both
    // read `counted = max - 1`, both pass, and the cap is quietly one too high —
    // which is exactly the kind of hole someone would automate.
    await tx.$queryRaw`SELECT id FROM "Subscription" WHERE "coachId" = ${coachId} FOR UPDATE`;

    const alreadyCounted = await this.isWithinWindow(
      coachId,
      studentProfileId,
      tx,
    );
    if (alreadyCounted) return;

    const counted = await this.countBillableStudents(coachId, tx);
    if (counted >= max) {
      throw new HttpException(
        {
          code: "STUDENT_QUOTA_EXCEEDED",
          message: `Your plan covers ${max} student(s). ${counted} are active in the last ${QUOTA_WINDOW_DAYS} days.`,
          // The panel turns these into a sentence that says when space frees up,
          // so the coach never meets an unexplained wall.
          details: { counted, max, windowDays: QUOTA_WINDOW_DAYS },
        },
        402,
      );
    }
  }

  /** Tier cap read through the same client as the caller's transaction. */
  private async maxStudentsWithin(
    coachId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number | null> {
    const sub = await tx.subscription.findFirst({
      where: { coachId },
      orderBy: { createdAt: "desc" },
    });
    // No row means FREE, never unlimited: this gate has to fail closed.
    return TIER_MAX_STUDENTS[sub?.tier ?? SubscriptionTier.FREE];
  }

  private async isWithinWindow(
    coachId: string,
    studentProfileId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const since = new Date(Date.now() - QUOTA_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const existing = await tx.program.findFirst({
      where: { coachId, studentProfileId, updatedAt: { gte: since } },
      select: { id: true },
    });
    return existing !== null;
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
