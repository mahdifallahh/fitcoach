import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';

const DAY = 24 * 60 * 60 * 1000;

describe('SubscriptionsService', () => {
  let prisma: any;
  let service: SubscriptionsService;

  beforeEach(() => {
    prisma = {
      subscription: {
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 's1', ...data })),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 's2', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new SubscriptionsService(prisma);
  });

  describe('isActive', () => {
    it('true for a trial that has not expired', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ status: SubscriptionStatus.TRIALING, endsAt: new Date(Date.now() + DAY) });
      expect(await service.isActive('c1')).toBe(true);
    });
    it('false for an expired-status subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ status: SubscriptionStatus.EXPIRED, endsAt: new Date(Date.now() + DAY) });
      expect(await service.isActive('c1')).toBe(false);
    });
    it('false when the end date has passed even if still ACTIVE', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ status: SubscriptionStatus.ACTIVE, endsAt: new Date(Date.now() - DAY) });
      expect(await service.isActive('c1')).toBe(false);
    });
    it('false when there is no subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      expect(await service.isActive('c1')).toBe(false);
    });
  });

  describe('activateOrExtend', () => {
    it('extends from the current end date when still valid (stacking)', async () => {
      const end = new Date(Date.now() + 10 * DAY);
      prisma.subscription.findFirst.mockResolvedValue({ id: 's1', endsAt: end, status: SubscriptionStatus.TRIALING });
      const res = await service.activateOrExtend('c1', 'M3');
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(res.status).toBe(SubscriptionStatus.ACTIVE);
      // ~3 months after the existing end date (not after now)
      const expected = new Date(end);
      expected.setMonth(expected.getMonth() + 3);
      expect(res.endsAt.getTime()).toBe(expected.getTime());
    });
    it('extends from now when the current plan already lapsed', async () => {
      const past = new Date(Date.now() - 5 * DAY);
      prisma.subscription.findFirst.mockResolvedValue({ id: 's1', endsAt: past, status: SubscriptionStatus.EXPIRED });
      const res = await service.activateOrExtend('c1', 'M3');
      expect(res.endsAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('expireDue', () => {
    it('flips overdue trials/plans to EXPIRED', async () => {
      prisma.subscription.updateMany.mockResolvedValue({ count: 3 });
      expect(await service.expireDue()).toBe(3);
      const arg = prisma.subscription.updateMany.mock.calls[0][0];
      expect(arg.data.status).toBe(SubscriptionStatus.EXPIRED);
      expect(arg.where.status.in).toEqual([SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE]);
    });
  });
});
