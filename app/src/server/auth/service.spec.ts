import { AuthService } from "./service";
import { UnauthorizedException } from "../http/errors";
import { hashPassword } from "../utils/crypto";

/** Build an AuthService with just the collaborators each test needs. */
function makeService(overrides: {
  users?: any;
  tokens?: any;
  otp?: any;
  config?: any;
}) {
  const users = overrides.users ?? {};
  const tokens = overrides.tokens ?? {
    signAccessToken: jest.fn().mockResolvedValue("access"),
    issueRefreshToken: jest.fn().mockResolvedValue("refresh"),
  };
  const otp = overrides.otp ?? {};
  const config = overrides.config ?? { isProduction: false, get: () => "" };
  return new AuthService(otp, tokens, users, {} as any, config);
}

describe("AuthService.checkIdentifier", () => {
  it("reports a known account with a password", async () => {
    const users = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "u1", passwordHash: "scrypt$a$b" }),
    };
    const res = await makeService({ users }).checkIdentifier("+989120000000");
    expect(res).toEqual({ exists: true, hasPassword: true });
  });

  it("reports a known account without a password (OTP-only so far)", async () => {
    const users = { findByIdentifier: jest.fn().mockResolvedValue({ id: "u1", passwordHash: null }) };
    const res = await makeService({ users }).checkIdentifier("+989120000000");
    expect(res).toEqual({ exists: true, hasPassword: false });
  });

  it("reports an unknown account", async () => {
    const users = { findByIdentifier: jest.fn().mockResolvedValue(null) };
    const res = await makeService({ users }).checkIdentifier("+989120000000");
    expect(res).toEqual({ exists: false, hasPassword: false });
  });
});

describe("AuthService.loginWithPassword", () => {
  it("issues a session on the correct password", async () => {
    const hash = await hashPassword("correct-horse");
    const users = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "u1", role: "COACH", passwordHash: hash }),
      getProfileSnapshot: jest.fn().mockResolvedValue({ id: "u1", role: "COACH" }),
    };
    const res = await makeService({ users }).loginWithPassword("+989120000000", "correct-horse");
    expect(res.accessToken).toBe("access");
    expect(res.user.id).toBe("u1");
  });

  it("rejects a wrong password with BAD_CREDENTIALS", async () => {
    const hash = await hashPassword("correct-horse");
    const users = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "u1", role: "COACH", passwordHash: hash }),
    };
    await expect(
      makeService({ users }).loginWithPassword("+989120000000", "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an unknown user with the same error (no enumeration)", async () => {
    const users = { findByIdentifier: jest.fn().mockResolvedValue(null) };
    await expect(
      makeService({ users }).loginWithPassword("+989120000000", "whatever"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when the account has no password set", async () => {
    const users = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "u1", role: "COACH", passwordHash: null }),
    };
    await expect(
      makeService({ users }).loginWithPassword("+989120000000", "anything"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.setPassword", () => {
  it("stores a scrypt hash (never the plaintext)", async () => {
    const users = { setPasswordHash: jest.fn().mockResolvedValue({}) };
    await makeService({ users }).setPassword("u1", "my-new-password");
    expect(users.setPasswordHash).toHaveBeenCalledTimes(1);
    const [id, stored] = users.setPasswordHash.mock.calls[0];
    expect(id).toBe("u1");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    expect(stored).not.toContain("my-new-password");
  });
});
