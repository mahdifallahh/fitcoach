import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { PrismaClient, Role } from "@prisma/client";
import { AppConfig } from "../config";
import { generateToken, hashSecret } from "../utils/crypto";
import { UnauthorizedException } from "../http/errors";
import type { CookieSpec } from "../http/envelope";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
/** Refresh cookie is scoped so it's only sent to the auth endpoints. */
export const REFRESH_COOKIE_PATH = "/api/auth";

/** Payload embedded in the access JWT. */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/**
 * Token strategy:
 *  - Access: stateless HS256 JWT (short TTL), verified on every request (jose).
 *  - Refresh: opaque random token, stored hashed + revocable, rotated on use.
 * Both are delivered as httpOnly cookies.
 */
export class TokenService {
  private readonly accessSecret: Uint8Array;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
  ) {
    this.accessSecret = new TextEncoder().encode(
      config.get("JWT_ACCESS_SECRET"),
    );
  }

  async signAccessToken(userId: string, role: Role): Promise<string> {
    return new SignJWT({ role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${this.config.get("JWT_ACCESS_TTL")}s`)
      .sign(this.accessSecret);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret);
    return { sub: payload.sub as string, role: payload.role as Role };
  }

  /** Create + persist a new refresh token; returns the raw value for the cookie. */
  async issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
    const raw = generateToken(48);
    const ttlMs = this.config.get("JWT_REFRESH_TTL") * 1000;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashSecret(raw),
        userAgent: userAgent?.slice(0, 255),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return raw;
  }

  /** Validate + rotate a refresh token. Revokes the old one, issues a new one. */
  async rotateRefreshToken(
    raw: string | undefined,
    userAgent?: string,
  ): Promise<{ userId: string; role: Role; newRefresh: string }> {
    if (!raw) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH",
        message: "Invalid refresh token",
      });
    }
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashSecret(raw) },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH",
        message: "Invalid refresh token",
      });
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const newRefresh = await this.issueRefreshToken(record.userId, userAgent);
    return { userId: record.userId, role: record.user.role, newRefresh };
  }

  async revokeRefreshToken(raw: string | undefined): Promise<void> {
    if (!raw) return;
    await this.prisma.refreshToken
      .updateMany({
        where: { tokenHash: hashSecret(raw), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  // ── Cookie specs (maxAge in seconds for the Next cookie API) ────────────────
  buildAccessCookie(token: string): CookieSpec {
    return {
      name: ACCESS_COOKIE,
      value: token,
      options: {
        ...this.baseCookieOptions(),
        path: "/",
        maxAge: this.config.get("JWT_ACCESS_TTL"),
      },
    };
  }

  buildRefreshCookie(token: string): CookieSpec {
    return {
      name: REFRESH_COOKIE,
      value: token,
      options: {
        ...this.baseCookieOptions(),
        path: REFRESH_COOKIE_PATH,
        maxAge: this.config.get("JWT_REFRESH_TTL"),
      },
    };
  }

  clearCookies(): CookieSpec[] {
    const base = this.baseCookieOptions();
    return [
      {
        name: ACCESS_COOKIE,
        value: "",
        options: { ...base, path: "/", maxAge: 0 },
      },
      {
        name: REFRESH_COOKIE,
        value: "",
        options: { ...base, path: REFRESH_COOKIE_PATH, maxAge: 0 },
      },
    ];
  }

  private baseCookieOptions(): CookieSpec["options"] {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.isProduction,
    };
  }
}
