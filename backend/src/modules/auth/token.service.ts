import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AppConfigService } from '../../config/config.module';
import { PrismaService } from '../../prisma/prisma.service';
import { generateToken, hashSecret } from '../../common/utils/crypto.util';
import { CookieSpec, JwtPayload } from './auth.types';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

/**
 * Token strategy:
 *  - Access: stateless JWT (short TTL), verified on every request.
 *  - Refresh: opaque random token, stored hashed + revocable, rotated on use.
 * Both are delivered as httpOnly cookies.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async signAccessToken(userId: string, role: Role): Promise<string> {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwt.signAsync(payload);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token);
  }

  /** Create + persist a new refresh token; returns the raw value for the cookie. */
  async issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
    const raw = generateToken(48);
    const ttlMs = this.config.get('JWT_REFRESH_TTL') * 1000;
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
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Invalid refresh token' });
    }
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashSecret(raw) },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Invalid refresh token' });
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

  // ── Cookie specs ────────────────────────────────────────────────────────────
  buildAccessCookie(token: string): CookieSpec {
    return {
      name: ACCESS_COOKIE,
      value: token,
      options: { ...this.baseCookieOptions(), path: '/', maxAge: this.config.get('JWT_ACCESS_TTL') * 1000 },
    };
  }

  buildRefreshCookie(token: string): CookieSpec {
    return {
      name: REFRESH_COOKIE,
      value: token,
      options: {
        ...this.baseCookieOptions(),
        path: REFRESH_COOKIE_PATH,
        maxAge: this.config.get('JWT_REFRESH_TTL') * 1000,
      },
    };
  }

  clearCookies(): CookieSpec[] {
    const base = this.baseCookieOptions();
    return [
      { name: ACCESS_COOKIE, value: '', options: { ...base, path: '/', maxAge: 0 } },
      { name: REFRESH_COOKIE, value: '', options: { ...base, path: REFRESH_COOKIE_PATH, maxAge: 0 } },
    ];
  }

  private baseCookieOptions(): Record<string, unknown> {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.isProduction,
    };
  }
}
