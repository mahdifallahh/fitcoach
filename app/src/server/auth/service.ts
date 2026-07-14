import "server-only";
import type { Role } from "@prisma/client";
import { AppConfig } from "../config";
import { normalizeIdentifier } from "../utils/identifier";
import { NotificationsService } from "../notifications";
import { UsersService } from "../users/service";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { BadRequestException, UnauthorizedException } from "../http/errors";
import { OtpService } from "./otp";
import { TokenService } from "./tokens";

export interface AuthResult {
  user: NonNullable<Awaited<ReturnType<UsersService["getProfileSnapshot"]>>>;
  accessToken: string;
  refreshToken: string;
  /** True when this OTP verification just created the account → prompt for a password. */
  isNew?: boolean;
}

/** What the login form needs to decide which step to show next. */
export interface IdentifierStatus {
  exists: boolean;
  hasPassword: boolean;
}

export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Does this phone/email already have an account, and can it sign in with a
   * password? The login form branches on this: known user → password (or OTP),
   * unknown user → OTP signup. Deliberately does not reveal anything beyond
   * existence, which is unavoidable for this UX.
   */
  async checkIdentifier(identifier: string): Promise<IdentifierStatus> {
    const { channel, value } = normalizeIdentifier(identifier);
    const user = await this.users.findByIdentifier(value, channel);
    return { exists: !!user, hasPassword: !!user?.passwordHash };
  }

  /** Sign in an existing account with its password. */
  async loginWithPassword(
    identifier: string,
    password: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const { channel, value } = normalizeIdentifier(identifier);
    const user = await this.users.findByIdentifier(value, channel);

    // Same error for "no such user" and "wrong password" so the endpoint can't be
    // used to enumerate accounts (checkIdentifier is the one intentional leak).
    const ok = user && (await verifyPassword(password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedException({
        code: "BAD_CREDENTIALS",
        message: "Phone number or password is incorrect",
      });
    }

    return this.issueSession(user.id, user.role, userAgent);
  }

  /**
   * Set (or change) the signed-in user's password. Called right after OTP signup
   * so the next login is a single password entry.
   */
  async setPassword(userId: string, password: string): Promise<{ success: true }> {
    await this.users.setPasswordHash(userId, await hashPassword(password));
    return { success: true };
  }

  /** Step 1: send a login code to phone (SMS) or email. */
  async requestOtp(
    identifier: string,
  ): Promise<{ channel: "SMS" | "EMAIL"; sentTo: string; devCode?: string }> {
    const { channel, value } = normalizeIdentifier(identifier);
    const code = await this.otp.createLoginCode(value, channel);
    await this.notifications.sendOtpCode(channel, value, code);
    return {
      channel,
      sentTo: maskIdentifier(channel, value),
      // Dev convenience only: lets the login form auto-fill the code instead of
      // reading it from logs. Never populated once isProduction is true.
      ...(this.config.isProduction ? {} : { devCode: code }),
    };
  }

  /** Step 2: verify the code, creating the account on first login. */
  async verifyOtp(
    identifier: string,
    code: string,
    role: Role | undefined,
    userAgent?: string,
  ): Promise<AuthResult> {
    const { channel, value } = normalizeIdentifier(identifier);
    await this.otp.verifyLoginCode(value, code);

    // Platform owners are designated by env, never by the requested role.
    const isOwner = channel === "SMS" && this.adminPhones().includes(value);

    let user = await this.users.findByIdentifier(value, channel);
    let isNew = false;
    if (!user) {
      const effectiveRole: Role | undefined = isOwner ? "ADMIN" : role;
      if (!effectiveRole) {
        throw new BadRequestException({
          code: "ROLE_REQUIRED",
          message: "Role is required for new accounts",
        });
      }
      user = await this.users.createUser({
        identifier: value,
        channel,
        role: effectiveRole,
      });
      isNew = true;
    } else if (isOwner && user.role !== "ADMIN") {
      // The phone was added to ADMIN_PHONES after this account existed → promote.
      user = await this.users.setRole(user.id, "ADMIN");
    }

    const session = await this.issueSession(user.id, user.role, userAgent);
    // Prompt for a password on signup, and also for existing accounts that never
    // set one (they predate passwords, or only ever used OTP).
    return { ...session, isNew: isNew || !user.passwordHash };
  }

  /** Normalized owner phones from ADMIN_PHONES (comma-separated). */
  private adminPhones(): string[] {
    return this.config
      .get("ADMIN_PHONES")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => normalizeIdentifier(p).value);
  }

  /** Rotate the refresh token and mint a fresh access token. */
  async refresh(
    rawRefresh: string | undefined,
    userAgent?: string,
  ): Promise<AuthResult> {
    const { userId, role, newRefresh } = await this.tokens.rotateRefreshToken(
      rawRefresh,
      userAgent,
    );
    const accessToken = await this.tokens.signAccessToken(userId, role);
    const user = await this.users.getProfileSnapshot(userId);
    return { user: user!, accessToken, refreshToken: newRefresh };
  }

  async logout(rawRefresh?: string): Promise<void> {
    if (rawRefresh) await this.tokens.revokeRefreshToken(rawRefresh);
  }

  me(userId: string) {
    return this.users.getProfileSnapshot(userId);
  }

  private async issueSession(
    userId: string,
    role: Role,
    userAgent?: string,
  ): Promise<AuthResult> {
    const accessToken = await this.tokens.signAccessToken(userId, role);
    const refreshToken = await this.tokens.issueRefreshToken(userId, userAgent);
    const user = await this.users.getProfileSnapshot(userId);
    return { user: user!, accessToken, refreshToken };
  }
}

function maskIdentifier(channel: "SMS" | "EMAIL", value: string): string {
  if (channel === "EMAIL") {
    const [local, domain] = value.split("@");
    const head = local.slice(0, 2);
    return `${head}***@${domain}`;
  }
  return `${value.slice(0, 5)}***${value.slice(-2)}`;
}
