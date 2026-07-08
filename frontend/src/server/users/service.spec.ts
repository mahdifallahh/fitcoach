import { Role, SubscriptionStatus } from '@prisma/client';
import { UsersService } from './service';

describe('UsersService.createUser', () => {
  let tx: any;
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    tx = {
      user: { create: jest.fn().mockResolvedValue({ id: 'u1', role: Role.STUDENT }) },
      coachProfile: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null), // handle is free
      },
      subscription: { create: jest.fn().mockResolvedValue({}) },
      studentProfile: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    prisma = { $transaction: jest.fn((cb: any) => cb(tx)) };
    service = new UsersService(prisma);
  });

  it('creates a coach profile and a 7-day trial subscription for coaches', async () => {
    tx.user.create.mockResolvedValue({ id: 'c1', role: Role.COACH });
    await service.createUser({ identifier: '+989120000000', channel: 'SMS', role: Role.COACH });

    const coachData = tx.coachProfile.create.mock.calls[0][0].data;
    expect(coachData.userId).toBe('c1');
    expect(coachData.name).toBe('+989120000000');
    // phone coaches must NOT leak their number into the public handle
    expect(coachData.handle).toMatch(/^coach-[0-9a-f]{6}$/);
    const subData = tx.subscription.create.mock.calls[0][0].data;
    expect(subData.status).toBe(SubscriptionStatus.TRIALING);
    expect(subData.endsAt.getTime()).toBeGreaterThan(Date.now());
    expect(tx.studentProfile.updateMany).not.toHaveBeenCalled();
  });

  it('claims unlinked student profiles by phone on student registration', async () => {
    tx.user.create.mockResolvedValue({ id: 's1', role: Role.STUDENT });
    await service.createUser({ identifier: '+989121111111', channel: 'SMS', role: Role.STUDENT });

    expect(tx.studentProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: null, phone: '+989121111111' },
      data: { userId: 's1' },
    });
    expect(tx.coachProfile.create).not.toHaveBeenCalled();
    expect(tx.subscription.create).not.toHaveBeenCalled();
  });

  it('claims by email when registering with an email', async () => {
    tx.user.create.mockResolvedValue({ id: 's2', role: Role.STUDENT });
    await service.createUser({ identifier: 'kid@example.com', channel: 'EMAIL', role: Role.STUDENT });

    expect(tx.studentProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: null, email: 'kid@example.com' },
      data: { userId: 's2' },
    });
  });
});
