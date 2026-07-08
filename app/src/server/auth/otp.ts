import 'server-only';
import type { OtpChannel, OtpPurpose, PrismaClient } from '@prisma/client';
import { AppConfig } from '../config';
import { BadRequestException, HttpException } from '../http/errors';
import { generateNumericCode, hashSecret, safeCompareHash } from '../utils/crypto';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export class OtpService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
  ) {}

  /** Issue a login OTP for an identifier. Returns the plaintext code for dispatch. */
  async createLoginCode(identifier: string, channel: OtpChannel): Promise<string> {
    await this.enforceCooldown(identifier, 'LOGIN');
    await this.invalidateActive(identifier, 'LOGIN');

    const code = generateNumericCode(this.config.get('OTP_LENGTH'));
    await this.prisma.otpToken.create({
      data: {
        identifier,
        channel,
        purpose: 'LOGIN',
        codeHash: hashSecret(code),
        expiresAt: this.expiry(),
      },
    });
    return code;
  }

  /** Verify a login OTP. Throws on invalid/expired/locked; consumes on success. */
  async verifyLoginCode(identifier: string, code: string): Promise<void> {
    const token = await this.prisma.otpToken.findFirst({
      where: {
        identifier,
        purpose: 'LOGIN',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Code is invalid or expired' });
    }
    if (token.attempts >= MAX_ATTEMPTS) {
      await this.consume(token.id);
      throw new HttpException({ code: 'OTP_LOCKED', message: 'Too many attempts, request a new code' }, 429);
    }
    if (!safeCompareHash(token.codeHash, hashSecret(code))) {
      await this.prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Code is invalid or expired' });
    }
    await this.consume(token.id);
  }

  private async enforceCooldown(identifier: string, purpose: OtpPurpose): Promise<void> {
    const recent = await this.prisma.otpToken.findFirst({
      where: { identifier, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        throw new HttpException(
          { code: 'OTP_COOLDOWN', message: `Please wait ${retryAfter}s before requesting again`, details: { retryAfter } },
          429,
        );
      }
    }
  }

  private invalidateActive(identifier: string, purpose: OtpPurpose) {
    return this.prisma.otpToken.updateMany({
      where: { identifier, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  private consume(id: string) {
    return this.prisma.otpToken.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  private expiry(): Date {
    return new Date(Date.now() + this.config.get('OTP_TTL_SECONDS') * 1000);
  }
}
