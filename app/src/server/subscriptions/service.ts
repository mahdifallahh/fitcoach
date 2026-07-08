import 'server-only';
import { SubscriptionStatus, type PrismaClient, type SubscriptionPlan } from '@prisma/client';
import { PLANS, TRIAL_DAYS, addMonths } from './plans';
import { ConflictException } from '../http/errors';

export class SubscriptionsService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Latest subscription row for a coach (trial or paid). */
  getCurrent(coachId: string) {
    return this.prisma.subscription.findFirst({
      where: { coachId },
      orderBy: { endsAt: 'desc' },
    });
  }

  /**
   * Coach-initiated, one-time free trial. Unlike the old auto-start-at-signup
   * behavior, a coach has no subscription row until they activate this themselves
   * from the billing page. Since this creates the coach's very first subscription
   * row, any existing row (trial or paid, even if since expired) blocks a second
   * free trial.
   */
  async activateTrial(coachId: string) {
    const current = await this.getCurrent(coachId);
    if (current) {
      throw new ConflictException({
        code: 'TRIAL_ALREADY_USED',
        message: 'Your free trial has already been used',
      });
    }
    const now = new Date();
    return this.prisma.subscription.create({
      data: {
        coachId,
        status: SubscriptionStatus.TRIALING,
        startsAt: now,
        endsAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  }

  /** True while the coach can create/edit (trial not expired, or active paid plan). */
  async isActive(coachId: string): Promise<boolean> {
    const sub = await this.getCurrent(coachId);
    if (!sub) return false;
    const live = sub.status === SubscriptionStatus.TRIALING || sub.status === SubscriptionStatus.ACTIVE;
    return live && sub.endsAt.getTime() > Date.now();
  }

  /**
   * Activate or extend a paid plan. Extends from the later of now / current end
   * (so paying before expiry stacks). Reuses the existing row (the trial).
   */
  async activateOrExtend(coachId: string, plan: SubscriptionPlan) {
    const current = await this.getCurrent(coachId);
    const now = new Date();
    const base = current && current.endsAt > now ? current.endsAt : now;
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

  /** Sweep expired trials/plans → EXPIRED. Returns affected count. */
  async expireDue(): Promise<number> {
    const { count } = await this.prisma.subscription.updateMany({
      where: {
        status: { in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE] },
        endsAt: { lt: new Date() },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    return count;
  }
}
