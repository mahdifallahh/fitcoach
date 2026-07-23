import { UsersService } from "./service";

/**
 * Dual-role capabilities + account deletion. These cover the two changes with
 * the widest blast radius: an account holding both sides, and an erasure that
 * has to work around the `onDelete: Restrict` on Exercise references.
 */
function makeTx() {
  const tx: any = {
    coachProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    studentProfile: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    program: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    programTemplate: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    exercise: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    exerciseCategory: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    programRequest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    payment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    subscription: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  return tx;
}

function makeService(tx: any, userRow: any) {
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(userRow) },
    coachProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  return { service: new UsersService(prisma), prisma };
}

describe("UsersService.getCapabilities", () => {
  it("returns both flags for a dual-role account", async () => {
    const prisma: any = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ isCoach: true, isStudent: true }),
      },
    };
    const caps = await new UsersService(prisma).getCapabilities("u1");
    expect(caps).toEqual({ isCoach: true, isStudent: true });
  });

  it("defaults to no capabilities for an unknown user", async () => {
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const caps = await new UsersService(prisma).getCapabilities("nope");
    expect(caps).toEqual({ isCoach: false, isStudent: false });
  });
});

describe("UsersService.enableStudent", () => {
  it("flags the account and claims profiles already written for its phone", async () => {
    const tx = makeTx();
    const { service } = makeService(tx, { id: "u1", phone: "+98912", email: null });

    await service.enableStudent("u1");

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isStudent: true },
    });
    // The linking rule: unclaimed profiles for this phone become theirs.
    expect(tx.studentProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: null, phone: "+98912" },
        data: { userId: "u1" },
      }),
    );
  });
});

describe("UsersService.enableCoach", () => {
  it("creates the coach profile once and never seeds the handle from the phone", async () => {
    const tx = makeTx();
    const { service } = makeService(tx, {
      id: "u1",
      phone: "+989356995806",
      email: null,
      isCoach: false,
    });

    await service.enableCoach("u1");

    expect(tx.coachProfile.create).toHaveBeenCalled();
    const handle = tx.coachProfile.create.mock.calls[0][0].data.handle;
    // A phone in the public URL would leak it — handles are random for SMS users.
    expect(handle).not.toContain("989356995806");
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isCoach: true },
    });
  });

  it("is idempotent — an existing profile is not recreated", async () => {
    const tx = makeTx();
    tx.coachProfile.findUnique.mockResolvedValue({ userId: "u1" });
    const { service } = makeService(tx, { id: "u1", phone: "+98912", email: null });

    await service.enableCoach("u1");

    expect(tx.coachProfile.create).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isCoach: true },
    });
  });
});

describe("UsersService.deleteAccount", () => {
  it("clears Exercise references before deleting exercises (onDelete: Restrict)", async () => {
    const tx = makeTx();
    tx.coachProfile.findUnique.mockResolvedValue({ userId: "u1" });
    const { service } = makeService(tx, { id: "u1" });

    const order: string[] = [];
    for (const key of ["program", "programTemplate", "exercise"] as const) {
      tx[key].deleteMany.mockImplementation(async () => {
        order.push(key);
        return { count: 0 };
      });
    }

    await service.deleteAccount("u1");

    // Programs and templates must go first or the Restrict FK blocks the delete.
    expect(order.indexOf("program")).toBeLessThan(order.indexOf("exercise"));
    expect(order.indexOf("programTemplate")).toBeLessThan(order.indexOf("exercise"));
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("releases claimed student profiles instead of destroying the coach's records", async () => {
    const tx = makeTx();
    const { service } = makeService(tx, { id: "s1" }); // no coach profile

    await service.deleteAccount("s1");

    // The coach keeps the profile + its programs; it just becomes unclaimed.
    expect(tx.studentProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "s1" },
      data: { userId: null },
    });
    expect(tx.coachProfile.delete).not.toHaveBeenCalled();
  });
});
