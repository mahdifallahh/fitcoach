import "server-only";
import {
  PaymentStatus,
  Role,
  SubscriptionStatus,
  type PrismaClient,
} from "@prisma/client";
import { NotFoundException } from "../http/errors";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Platform-owner operations behind the ADMIN role. Read-mostly + subscription grants. */
export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  /** One-screen pulse of the whole platform. */
  async overview() {
    const [
      coaches,
      students,
      programs,
      publishedPrograms,
      requests,
      pendingRequests,
      exercises,
      subsByStatus,
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
      this.prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
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

    const subscriptions: Record<string, number> = {};
    for (const row of subsByStatus) subscriptions[row.status] = row._count._all;

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
      subscriptions,
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
      return {
        userId: c.userId,
        name: c.name,
        handle: c.handle,
        phone: c.user.phone,
        email: c.user.email,
        joinedAt: c.user.createdAt,
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
   * Owner-granted access: extend the coach's subscription by N days (stacks on a
   * still-valid end date, otherwise starts from now). Creates the row if the coach
   * never had one. Marked ACTIVE — a grant is real access, not a trial.
   */
  async grantSubscription(coachUserId: string, days: number) {
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
    const now = new Date();
    // A tier row (endsAt null) means the grant starts from now.
    const base =
      current && current.endsAt && current.endsAt > now ? current.endsAt : now;
    const endsAt = new Date(base.getTime() + days * DAY_MS);

    if (current) {
      return this.prisma.subscription.update({
        where: { id: current.id },
        data: { status: SubscriptionStatus.ACTIVE, endsAt },
      });
    }
    return this.prisma.subscription.create({
      data: {
        coachId: coachUserId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
        endsAt,
      },
    });
  }

  /** Cut access now: the coach drops to read-only immediately. */
  async expireSubscription(coachUserId: string) {
    const current = await this.prisma.subscription.findFirst({
      where: { coachId: coachUserId },
      orderBy: { createdAt: "desc" },
    });
    if (!current)
      throw new NotFoundException({
        code: "SUBSCRIPTION_NOT_FOUND",
        message: "This coach has no subscription",
      });
    return this.prisma.subscription.update({
      where: { id: current.id },
      data: { status: SubscriptionStatus.EXPIRED, endsAt: new Date() },
    });
  }
}
