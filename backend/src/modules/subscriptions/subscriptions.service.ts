import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PLANS, addMonths } from './plans';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Latest subscription row for a coach (trial or paid). */
  getCurrent(coachId: string) {
    return this.prisma.subscription.findFirst({
      where: { coachId },
      orderBy: { endsAt: 'desc' },
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

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpirySweep(): Promise<void> {
    const count = await this.expireDue();
    if (count > 0) this.logger.log(`Expired ${count} subscription(s)`);
  }
}
