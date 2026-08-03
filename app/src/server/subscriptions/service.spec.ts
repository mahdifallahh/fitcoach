import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { SubscriptionsService } from "./service";

const DAY = 24 * 60 * 60 * 1000;

describe("SubscriptionsService", () => {
  let prisma: any;
  let service: SubscriptionsService;

  beforeEach(() => {
    prisma = {
      subscription: {
        findFirst: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ id: "s1", ...data })),
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ id: "s2", ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new SubscriptionsService(prisma);
  });

  describe("isActive", () => {
    it("true for a permanent tier row (endsAt null, ACTIVE)", async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.FREE,
        endsAt: null,
      });
      expect(await service.isActive("c1")).toBe(true);
    });
    it("true (implicit FREE) when there is no subscription row", async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      expect(await service.isActive("c1")).toBe(true);
    });
    it("false for an EXPIRED subscription", async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: SubscriptionStatus.EXPIRED,
        endsAt: null,
      });
      expect(await service.isActive("c1")).toBe(false);
    });
    it("true for a legacy paid plan whose end date is still ahead", async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        endsAt: new Date(Date.now() + DAY),
      });
      expect(await service.isActive("c1")).toBe(true);
    });
    it("false when a legacy paid plan's end date has passed", async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        endsAt: new Date(Date.now() - DAY),
      });
      expect(await service.isActive("c1")).toBe(false);
    });
  });

  describe("ensureFreePlan", () => {
    it("creates a permanent FREE row when the coach has none", async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      const res = await service.ensureFreePlan("c1");
      expect(prisma.subscription.create).toHaveBeenCalled();
      const data = prisma.subscription.create.mock.calls[0][0].data;
      expect(data.coachId).toBe("c1");
      expect(data.tier).toBe(SubscriptionTier.FREE);
      expect(data.status).toBe(SubscriptionStatus.ACTIVE);
      expect(data.endsAt).toBeNull();
      expect(res.tier).toBe(SubscriptionTier.FREE);
    });
    it("is idempotent — returns the existing row without creating a second", async () => {
      const existing = {
        id: "s1",
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        endsAt: null,
      };
      prisma.subscription.findFirst.mockResolvedValue(existing);
      const res = await service.ensureFreePlan("c1");
      expect(res).toBe(existing);
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });
  });

  describe("maxStudents", () => {
    it("returns the tier cap (FREE = 1)", async () => {
      prisma.subscription.findFirst.mockResolvedValue({ tier: SubscriptionTier.FREE });
      expect(await service.maxStudents("c1")).toBe(1);
    });
    it("returns null (unlimited) for PRO", async () => {
      prisma.subscription.findFirst.mockResolvedValue({ tier: SubscriptionTier.PRO });
      expect(await service.maxStudents("c1")).toBeNull();
    });
    it("defaults to FREE when there is no row", async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      expect(await service.maxStudents("c1")).toBe(1);
    });
  });

  describe("activateOrExtend (legacy paid)", () => {
    it("extends from the current end date when still valid (stacking)", async () => {
      const end = new Date(Date.now() + 10 * DAY);
      prisma.subscription.findFirst.mockResolvedValue({
        id: "s1",
        endsAt: end,
        status: SubscriptionStatus.ACTIVE,
      });
      const res = await service.activateOrExtend("c1", "M3");
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(res.status).toBe(SubscriptionStatus.ACTIVE);
      const expected = new Date(end);
      expected.setMonth(expected.getMonth() + 3);
      expect(res.endsAt!.getTime()).toBe(expected.getTime());
    });
    it("extends from now when the current plan already lapsed (null endsAt)", async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: "s1",
        endsAt: null,
        status: SubscriptionStatus.ACTIVE,
      });
      const res = await service.activateOrExtend("c1", "M3");
      expect(res.endsAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("expireDue", () => {
    it("flips overdue time-based plans to EXPIRED (tier rows with null endsAt are excluded)", async () => {
      prisma.subscription.updateMany.mockResolvedValue({ count: 3 });
      expect(await service.expireDue()).toBe(3);
      const arg = prisma.subscription.updateMany.mock.calls[0][0];
      expect(arg.data.status).toBe(SubscriptionStatus.EXPIRED);
      expect(arg.where.endsAt).toEqual({ lt: expect.any(Date) });
    });
  });
});

describe("SubscriptionsService — the student cap", () => {
  /** A tx double: the raw lock is a no-op, the rest is per-test. */
  function makeTx(overrides: any = {}) {
    return {
      $queryRaw: jest.fn().mockResolvedValue([]),
      subscription: { findFirst: jest.fn().mockResolvedValue({ tier: SubscriptionTier.FREE }) },
      program: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
    };
  }

  let service: SubscriptionsService;
  beforeEach(() => {
    service = new SubscriptionsService({} as any);
  });

  it("counts each student once, however many programs they have", async () => {
    const tx = makeTx();
    tx.program.findMany.mockResolvedValue([{ studentProfileId: "a" }, { studentProfileId: "b" }]);
    expect(await service.countBillableStudents("c1", tx as any)).toBe(2);
    // Distinctness is the database's job, not a post-filter we could get wrong.
    expect(tx.program.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ["studentProfileId"] }),
    );
  });

  it("refuses a new student once the tier cap is reached", async () => {
    const tx = makeTx();
    tx.program.findMany.mockResolvedValue([{ studentProfileId: "other" }]); // FREE = 1
    await expect(service.assertCanAddStudent("c1", "new-student", tx as any)).rejects.toMatchObject({
      code: "STUDENT_QUOTA_EXCEEDED",
      status: 402,
      details: { counted: 1, max: 1 },
    });
  });

  it("still lets a capped coach keep writing for a student they already have", async () => {
    const tx = makeTx();
    tx.program.findFirst.mockResolvedValue({ id: "p1" }); // already inside the window
    tx.program.findMany.mockResolvedValue([{ studentProfileId: "existing" }]);
    await expect(service.assertCanAddStudent("c1", "existing", tx as any)).resolves.toBeUndefined();
  });

  it("locks the coach's subscription row so two creates cannot both slip past", async () => {
    const tx = makeTx();
    await service.assertCanAddStudent("c1", "s1", tx as any).catch(() => undefined);
    expect(tx.$queryRaw).toHaveBeenCalled();
  });

  it("skips the whole check — and the lock — on an unlimited tier", async () => {
    const tx = makeTx({
      subscription: { findFirst: jest.fn().mockResolvedValue({ tier: SubscriptionTier.PRO }) },
    });
    await expect(service.assertCanAddStudent("c1", "s1", tx as any)).resolves.toBeUndefined();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it("treats a missing subscription row as FREE, never as unlimited", async () => {
    const tx = makeTx({ subscription: { findFirst: jest.fn().mockResolvedValue(null) } });
    tx.program.findMany.mockResolvedValue([{ studentProfileId: "other" }]);
    await expect(service.assertCanAddStudent("c1", "new", tx as any)).rejects.toMatchObject({
      code: "STUDENT_QUOTA_EXCEEDED",
    });
  });
});
