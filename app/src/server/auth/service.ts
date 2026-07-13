import "server-only";
import type { Role } from "@prisma/client";
import { AppConfig } from "../config";
import { normalizeIdentifier } from "../utils/identifier";
import { NotificationsService } from "../notifications";
import { UsersService } from "../users/service";
import { BadRequestException } from "../http/errors";
import { OtpService } from "./otp";
import { TokenService } from "./tokens";

export interface AuthResult {
  user: NonNullable<Awaited<ReturnType<UsersService["getProfileSnapshot"]>>>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfig,
  ) {}

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
    } else if (isOwner && user.role !== "ADMIN") {
      // The phone was added to ADMIN_PHONES after this account existed → promote.
      user = await this.users.setRole(user.id, "ADMIN");
    }

    return this.issueSession(user.id, user.role, userAgent);
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
