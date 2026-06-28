import {
  BadRequestException,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../config/config.module';
import {
  generateNumericCode,
  generateToken,
  hashSecret,
  safeCompareHash,
} from '../../common/utils/crypto.util';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Issue a login OTP for an identifier. Returns the plaintext code for dispatch. */
  async createLoginCode(identifier: string, channel: OtpChannel): Promise<string> {
    await this.enforceCooldown(identifier, OtpPurpose.LOGIN);
    await this.invalidateActive(identifier, OtpPurpose.LOGIN);

    const code = generateNumericCode(this.config.get('OTP_LENGTH'));
    await this.prisma.otpToken.create({
      data: {
        identifier,
        channel,
        purpose: OtpPurpose.LOGIN,
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
        purpose: OtpPurpose.LOGIN,
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
      throw new HttpException(
        { code: 'OTP_LOCKED', message: 'Too many attempts, request a new code' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
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

  /** Issue a magic-link token; returns the raw token to embed in the URL. */
  async createMagicLinkToken(identifier: string): Promise<string> {
    await this.enforceCooldown(identifier, OtpPurpose.MAGIC_LINK);
    await this.invalidateActive(identifier, OtpPurpose.MAGIC_LINK);

    const raw = generateToken(32);
    await this.prisma.otpToken.create({
      data: {
        identifier,
        channel: OtpChannel.EMAIL,
        purpose: OtpPurpose.MAGIC_LINK,
        codeHash: hashSecret(raw),
        expiresAt: this.expiry(),
      },
    });
    return raw;
  }

  /** Consume a magic-link token; returns the associated identifier (email). */
  async consumeMagicLinkToken(raw: string): Promise<string> {
    const token = await this.prisma.otpToken.findFirst({
      where: {
        purpose: OtpPurpose.MAGIC_LINK,
        codeHash: hashSecret(raw),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!token) {
      throw new BadRequestException({ code: 'LINK_INVALID', message: 'Link is invalid or expired' });
    }
    await this.consume(token.id);
    return token.identifier;
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
          HttpStatus.TOO_MANY_REQUESTS,
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
