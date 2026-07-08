import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from './service';
import { ConflictException } from '../http/errors';
import { TRIAL_DAYS } from './plans';

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

  describe('activateTrial', () => {
    it('creates a TRIALING subscription for TRIAL_DAYS when the coach has none yet', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      const res = await service.activateTrial('c1');
      expect(prisma.subscription.create).toHaveBeenCalled();
      const data = prisma.subscription.create.mock.calls[0][0].data;
      expect(data.coachId).toBe('c1');
      expect(data.status).toBe(SubscriptionStatus.TRIALING);
      const expectedEnd = data.startsAt.getTime() + TRIAL_DAYS * DAY;
      expect(data.endsAt.getTime()).toBe(expectedEnd);
      expect(res.status).toBe(SubscriptionStatus.TRIALING);
    });

    it('rejects a second trial when the coach already has a subscription row (even if expired)', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ id: 's1', status: SubscriptionStatus.EXPIRED, endsAt: new Date(Date.now() - DAY) });
      await expect(service.activateTrial('c1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.subscription.create).not.toHaveBeenCalled();
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
