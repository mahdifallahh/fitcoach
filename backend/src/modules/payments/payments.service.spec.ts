import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

function makeConfig(isProd = false) {
  const values: Record<string, unknown> = {
    APP_PUBLIC_URL: 'http://localhost:3000',
    BACKEND_PUBLIC_URL: 'http://localhost:4000',
  };
  return { get: (k: string) => values[k], isProduction: isProd } as any;
}

describe('PaymentsService', () => {
  let prisma: any;
  let subscriptions: any;
  let zarinpal: any;
  let stripe: any;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = {
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'p1', coachId: 'c1', plan: 'M3' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', coachId: 'c1', plan: 'M3', status: PaymentStatus.PENDING }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    subscriptions = {
      activateOrExtend: jest.fn().mockResolvedValue({ id: 's1', endsAt: new Date(Date.now() + 1e9) }),
      getCurrent: jest.fn().mockResolvedValue({ id: 's1' }),
    };
    zarinpal = { gateway: PaymentGateway.ZARINPAL, configured: false, createCheckout: jest.fn() };
    stripe = { gateway: PaymentGateway.STRIPE, configured: false, createCheckout: jest.fn() };
    service = new PaymentsService(prisma, makeConfig(), subscriptions, zarinpal, stripe);
  });

  it('routes to the in-app simulate flow when no gateway is configured', async () => {
    const res = await service.createCheckout('c1', 'M3', PaymentGateway.ZARINPAL, 'fa');
    expect(res.redirectUrl).toBe('http://localhost:3000/fa/coach/billing?simulate=p1');
    expect(prisma.payment.create).toHaveBeenCalled();
    expect(zarinpal.createCheckout).not.toHaveBeenCalled(); // no real gateway call
  });

  it('uses the real gateway when configured', async () => {
    zarinpal.configured = true;
    zarinpal.createCheckout.mockResolvedValue({ redirectUrl: 'https://zp/StartPay/AUTH', reference: 'AUTH' });
    const res = await service.createCheckout('c1', 'M3', PaymentGateway.ZARINPAL, 'fa');
    expect(zarinpal.createCheckout).toHaveBeenCalled();
    expect(res.redirectUrl).toBe('https://zp/StartPay/AUTH');
  });

  it('devComplete activates the plan', async () => {
    await service.devComplete('c1', 'p1');
    expect(subscriptions.activateOrExtend).toHaveBeenCalledWith('c1', 'M3');
    expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { subscriptionId: 's1' } });
  });

  it('devComplete is disabled in production', async () => {
    service = new PaymentsService(prisma, makeConfig(true), subscriptions, zarinpal, stripe);
    await expect(service.devComplete('c1', 'p1')).rejects.toThrow();
    expect(subscriptions.activateOrExtend).not.toHaveBeenCalled();
  });

  it('does not double-activate an already-processed payment (idempotent)', async () => {
    prisma.payment.updateMany.mockResolvedValue({ count: 0 }); // payment was already PAID
    await service.devComplete('c1', 'p1');
    expect(subscriptions.activateOrExtend).not.toHaveBeenCalled();
  });
});
