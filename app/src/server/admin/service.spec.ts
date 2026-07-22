import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { AdminService } from "./service";
import { NotFoundException } from "../http/errors";

describe("AdminService.setCoachTier", () => {
  let prisma: any;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      coachProfile: { findUnique: jest.fn().mockResolvedValue({ userId: "c1" }) },
      subscription: {
        findFirst: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ id: "s1", ...data })),
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ id: "s2", ...data })),
      },
    };
    service = new AdminService(prisma);
  });

  it("updates the existing row to the new tier, normalized (ACTIVE, no plan/endsAt)", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "s1",
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      plan: "M3",
      endsAt: new Date(),
    });
    const res = await service.setCoachTier("c1", SubscriptionTier.NORMAL);
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: {
        tier: SubscriptionTier.NORMAL,
        status: SubscriptionStatus.ACTIVE,
        plan: null,
        endsAt: null,
      },
    });
    expect(res.tier).toBe(SubscriptionTier.NORMAL);
  });

  it("creates a tier row when the coach never had one", async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    const res = await service.setCoachTier("c1", SubscriptionTier.PRO);
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: {
        coachId: "c1",
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        endsAt: null,
      },
    });
    expect(res.tier).toBe(SubscriptionTier.PRO);
  });

  it("404s for an unknown coach", async () => {
    prisma.coachProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.setCoachTier("nope", SubscriptionTier.ECONOMY),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("AdminService.listCoaches quota", () => {
  function makeService(students: number, tier: SubscriptionTier) {
    const prisma: any = {
      coachProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: "c1",
            name: "Coach",
            handle: "coach",
            user: { phone: "+98912", email: null, createdAt: new Date() },
            subscriptions: [{ tier, status: SubscriptionStatus.ACTIVE, plan: null, endsAt: null }],
            _count: { programs: 2, students, exercises: 5 },
          },
        ]),
      },
    };
    return new AdminService(prisma);
  }

  it("flags a FREE coach at 1 student as at-quota (cap 1)", async () => {
    const [coach] = await makeService(1, SubscriptionTier.FREE).listCoaches();
    expect(coach.cap).toBe(1);
    expect(coach.atQuota).toBe(true);
  });

  it("a PRO coach is never at quota (cap null = unlimited)", async () => {
    const [coach] = await makeService(999, SubscriptionTier.PRO).listCoaches();
    expect(coach.cap).toBeNull();
    expect(coach.atQuota).toBe(false);
  });

  it("an ECONOMY coach below the cap is not at quota", async () => {
    const [coach] = await makeService(3, SubscriptionTier.ECONOMY).listCoaches();
    expect(coach.cap).toBe(10);
    expect(coach.atQuota).toBe(false);
  });
});
