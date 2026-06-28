import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/config.module';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './notifications.constants';
import { EmailProvider, SmsProvider } from './providers/provider.interfaces';

/**
 * Composes auth messages and dispatches them through the configured providers.
 * Message wording is intentionally bilingual-friendly and provider-agnostic.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    private readonly config: AppConfigService,
  ) {}

  async sendOtpCode(channel: 'SMS' | 'EMAIL', identifier: string, code: string): Promise<void> {
    const ttlMin = Math.round(this.config.get('OTP_TTL_SECONDS') / 60);
    if (channel === 'SMS') {
      await this.sms.send(identifier, `FitCoach code: ${code} (valid ${ttlMin}m) | کد ورود: ${code}`);
      return;
    }
    const subject = 'FitCoach login code | کد ورود فیت‌کوچ';
    await this.email.send({
      to: identifier,
      subject,
      text: `Your FitCoach login code is ${code}. It expires in ${ttlMin} minutes.`,
      html: `<p>Your FitCoach login code is <strong>${code}</strong>.</p><p>It expires in ${ttlMin} minutes.</p>`,
    });
  }

  async sendMagicLink(email: string, url: string): Promise<void> {
    await this.email.send({
      to: email,
      subject: 'Sign in to FitCoach | ورود به فیت‌کوچ',
      text: `Sign in to FitCoach: ${url}`,
      html: `<p><a href="${url}">Click here to sign in to FitCoach</a></p><p>${url}</p>`,
    });
  }
}
