import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AppConfigService } from '../../config/config.module';
import { normalizeIdentifier } from '../../common/utils/identifier.util';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

export interface AuthResult {
  user: NonNullable<Awaited<ReturnType<UsersService['getProfileSnapshot']>>>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
  ) {}

  /** Step 1: send a login code to phone (SMS) or email. */
  async requestOtp(identifier: string): Promise<{ channel: 'SMS' | 'EMAIL'; sentTo: string }> {
    const { channel, value } = normalizeIdentifier(identifier);
    const code = await this.otp.createLoginCode(value, channel);
    await this.notifications.sendOtpCode(channel, value, code);
    return { channel, sentTo: maskIdentifier(channel, value) };
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

    let user = await this.users.findByIdentifier(value, channel);
    if (!user) {
      if (!role) {
        throw new BadRequestException({ code: 'ROLE_REQUIRED', message: 'Role is required for new accounts' });
      }
      user = await this.users.createUser({ identifier: value, channel, role });
    }

    return this.issueSession(user.id, user.role, userAgent);
  }

  /** Email magic-link request. */
  async requestMagicLink(identifier: string, role: Role | undefined): Promise<{ link: string }> {
    const { channel, value } = normalizeIdentifier(identifier);
    if (channel !== 'EMAIL') {
      throw new BadRequestException({ code: 'EMAIL_REQUIRED', message: 'Magic link requires an email' });
    }
    const raw = await this.otp.createMagicLinkToken(value);
    // Link is consumed by the backend (it sets cookies) and then redirects to the app.
    const url = new URL('/api/auth/magic-link/consume', this.config.get('BACKEND_PUBLIC_URL'));
    url.searchParams.set('token', raw);
    if (role) url.searchParams.set('role', role);
    await this.notifications.sendMagicLink(value, url.toString());
    return { link: url.toString() };
  }

  /** Consume a magic link → returns a session (controller sets cookies + redirects). */
  async consumeMagicLink(token: string, role: Role | undefined, userAgent?: string): Promise<AuthResult> {
    const email = await this.otp.consumeMagicLinkToken(token);
    let user = await this.users.findByIdentifier(email, 'EMAIL');
    if (!user) {
      user = await this.users.createUser({
        identifier: email,
        channel: 'EMAIL',
        role: role ?? Role.STUDENT,
      });
    }
    return this.issueSession(user.id, user.role, userAgent);
  }

  /** Rotate the refresh token and mint a fresh access token. */
  async refresh(rawRefresh: string, userAgent?: string): Promise<AuthResult> {
    const { userId, role, newRefresh } = await this.tokens.rotateRefreshToken(rawRefresh, userAgent);
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

  private async issueSession(userId: string, role: Role, userAgent?: string): Promise<AuthResult> {
    const accessToken = await this.tokens.signAccessToken(userId, role);
    const refreshToken = await this.tokens.issueRefreshToken(userId, userAgent);
    const user = await this.users.getProfileSnapshot(userId);
    return { user: user!, accessToken, refreshToken };
  }
}

function maskIdentifier(channel: 'SMS' | 'EMAIL', value: string): string {
  if (channel === 'EMAIL') {
    const [local, domain] = value.split('@');
    const head = local.slice(0, 2);
    return `${head}***@${domain}`;
  }
  return `${value.slice(0, 5)}***${value.slice(-2)}`;
}
