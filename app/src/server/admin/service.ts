import "server-only";
import {
  PaymentStatus,
  Role,
  SubscriptionStatus,
  SubscriptionTier,
  type PrismaClient,
} from "@prisma/client";
import { NotFoundException } from "../http/errors";
import { TIER_MAX_STUDENTS } from "../subscriptions/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

/** All tiers in display order (FREE → PRO), so distributions are never sparse. */
const TIER_ORDER: SubscriptionTier[] = [
  SubscriptionTier.FREE,
  SubscriptionTier.ECONOMY,
  SubscriptionTier.NORMAL,
  SubscriptionTier.PRO,
];

/** Platform-owner operations behind the ADMIN role. Read-mostly + subscription grants. */
export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  /** One-screen pulse of the whole platform. */
  async overview() {
    const now = Date.now();
    const since7 = new Date(now - 7 * DAY_MS);
    const since30 = new Date(now - 30 * DAY_MS);

    const [
      coaches,
      students,
      programs,
      publishedPrograms,
      requests,
      pendingRequests,
      exercises,
      subsByTier,
      newCoaches7,
      newCoaches30,
      newStudents7,
      newStudents30,
      revenueByCurrency,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.COACH } }),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.program.count(),
      this.prisma.program.count({ where: { status: "PUBLISHED" } }),
      this.prisma.programRequest.count(),
      this.prisma.programRequest.count({ where: { status: "PENDING" } }),
      this.prisma.exercise.count(),
      this.prisma.subscription.groupBy({ by: ["tier"], _count: { _all: true } }),
      this.prisma.user.count({ where: { role: Role.COACH, createdAt: { gte: since7 } } }),
      this.prisma.user.count({ where: { role: Role.COACH, createdAt: { gte: since30 } } }),
      this.prisma.user.count({ where: { role: Role.STUDENT, createdAt: { gte: since7 } } }),
      this.prisma.user.count({ where: { role: Role.STUDENT, createdAt: { gte: since30 } } }),
      this.prisma.payment.groupBy({
        by: ["currency"],
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, phone: true, email: true, role: true, createdAt: true },
      }),
    ]);

    // Tier distribution, dense (every tier a key). Coaches with no subscription
    // row at all are implicitly FREE, so fold that remainder into FREE.
    const tiers: Record<SubscriptionTier, number> = {
      FREE: 0,
      ECONOMY: 0,
      NORMAL: 0,
      PRO: 0,
    };
    let subRows = 0;
    for (const row of subsByTier) {
      tiers[row.tier] = row._count._all;
      subRows += row._count._all;
    }
    tiers.FREE += Math.max(0, coaches - subRows);

    return {
      totals: {
        coaches,
        students,
        programs,
        publishedPrograms,
        requests,
        pendingRequests,
        exercises,
      },
      // Ordered [FREE, ECONOMY, NORMAL, PRO] tuples so the UI never re-sorts.
      tiers: TIER_ORDER.map((tier) => ({ tier, count: tiers[tier] })),
      growth: {
        newCoaches7,
        newCoaches30,
        newStudents7,
        newStudents30,
      },
      revenue: revenueByCurrency.map((r) => ({
        currency: r.currency,
        total: r._sum.amount ?? 0,
        payments: r._count._all,
      })),
      recentUsers,
    };
  }

  /** Coaches with contact, latest subscription and usage counts (searchable). */
  async listCoaches(search?: string) {
    const q = search?.trim();
    const coaches = await this.prisma.coachProfile.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { handle: { contains: q, mode: "insensitive" } },
              { user: { phone: { contains: q } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { phone: true, email: true, createdAt: true } },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { programs: true, students: true, exercises: true } },
      },
    });

    return coaches.map((c) => {
      const sub = c.subscriptions[0] ?? null;
      // Tier rows never expire (endsAt null); only a legacy paid plan can lapse.
      const live =
        !!sub &&
        (sub.status === SubscriptionStatus.TRIALING ||
          sub.status === SubscriptionStatus.ACTIVE) &&
        (sub.endsAt === null || sub.endsAt.getTime() > Date.now());
      const tier = sub?.tier ?? SubscriptionTier.FREE;
      // Student quota: cap null = unlimited. A coach is "at quota" once their
      // student count reaches the cap — the point admin cares about for upgrades.
      const cap = TIER_MAX_STUDENTS[tier];
      const atQuota = cap !== null && c._count.students >= cap;
      return {
        userId: c.userId,
        name: c.name,
        handle: c.handle,
        phone: c.user.phone,
        email: c.user.email,
        joinedAt: c.user.createdAt,
        tier,
        cap,
        atQuota,
        subscription: sub
          ? { status: sub.status, tier: sub.tier, plan: sub.plan, endsAt: sub.endsAt, live }
          : null,
        counts: c._count,
      };
    });
  }

  /** Latest payments across the platform (newest first). */
  listPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { coach: { select: { name: true, handle: true } } },
    });
  }

  /**
   * Owner sets a coach's capability tier (FREE / ECONOMY / NORMAL / PRO). This is
   * the live access model — a tier caps how many students the coach may manage,
   * not a time window. Normalizes the row to a clean tier grant: ACTIVE, no
   * `endsAt`, and any legacy time-based `plan` cleared. Creates the row if the
   * coach never had one.
   */
  async setCoachTier(coachUserId: string, tier: SubscriptionTier) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { userId: coachUserId },
      select: { userId: true },
    });
    if (!coach)
      throw new NotFoundException({ code: "COACH_NOT_FOUND", message: "Coach not found" });

    const current = await this.prisma.subscription.findFirst({
      where: { coachId: coachUserId },
      orderBy: { createdAt: "desc" },
    });
    if (current) {
      return this.prisma.subscription.update({
        where: { id: current.id },
        data: {
          tier,
          status: SubscriptionStatus.ACTIVE,
          plan: null, // clear any legacy time-based paid plan
          endsAt: null, // tier rows never expire
        },
      });
    }
    return this.prisma.subscription.create({
      data: {
        coachId: coachUserId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        endsAt: null,
      },
    });
  }
}
