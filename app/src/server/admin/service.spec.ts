import { SubscriptionStatus } from "@prisma/client";
import { AdminService } from "./service";
import { NotFoundException } from "../http/errors";

const DAY = 24 * 60 * 60 * 1000;

describe("AdminService subscriptions", () => {
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

  it("grant stacks on a still-valid end date", async () => {
    const end = new Date(Date.now() + 5 * DAY);
    prisma.subscription.findFirst.mockResolvedValue({
      id: "s1",
      endsAt: end,
      status: SubscriptionStatus.TRIALING,
    });
    const res = await service.grantSubscription("c1", 30);
    expect(res.status).toBe(SubscriptionStatus.ACTIVE);
    expect(res.endsAt!.getTime()).toBe(end.getTime() + 30 * DAY);
  });

  it("grant starts from now when the subscription already lapsed", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "s1",
      endsAt: new Date(Date.now() - DAY),
      status: SubscriptionStatus.EXPIRED,
    });
    const before = Date.now();
    const res = await service.grantSubscription("c1", 10);
    expect(res.endsAt!.getTime()).toBeGreaterThanOrEqual(before + 10 * DAY);
  });

  it("grant creates the row when the coach never had one", async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    const res = await service.grantSubscription("c1", 15);
    expect(prisma.subscription.create).toHaveBeenCalled();
    expect(res.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it("grant 404s for an unknown coach", async () => {
    prisma.coachProfile.findUnique.mockResolvedValue(null);
    await expect(service.grantSubscription("nope", 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("expire flips the latest subscription to EXPIRED now", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "s1",
      endsAt: new Date(Date.now() + 9 * DAY),
      status: SubscriptionStatus.ACTIVE,
    });
    const res = await service.expireSubscription("c1");
    expect(res.status).toBe(SubscriptionStatus.EXPIRED);
    expect(res.endsAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("expire 404s when there is no subscription", async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    await expect(service.expireSubscription("c1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
