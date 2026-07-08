import 'server-only';
import { AppConfig } from './config';

/**
 * Pluggable provider contracts. The dev "mock" implementations log to the
 * console; production implementations (vendor SMS, SMTP) are selected via env
 * (SMS_PROVIDER / EMAIL_PROVIDER) without touching the auth flow.
 */
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<void>;
}

export interface EmailProvider {
  readonly name: string;
  send(input: { to: string; subject: string; html: string; text: string }): Promise<void>;
}

class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  async send(to: string, message: string): Promise<void> {
    console.log(`\n[SMS →${to}] ${message}\n`);
  }
}

class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';
  async send(input: { to: string; subject: string; text: string }): Promise<void> {
    console.log(`\n[EMAIL →${input.to}] ${input.subject}\n${input.text}\n`);
  }
}

/**
 * Composes auth messages and dispatches them through the configured providers.
 * Message wording is intentionally bilingual-friendly and provider-agnostic.
 */
export class NotificationsService {
  constructor(
    private readonly sms: SmsProvider,
    private readonly email: EmailProvider,
    private readonly config: AppConfig,
  ) {}

  async sendOtpCode(channel: 'SMS' | 'EMAIL', identifier: string, code: string): Promise<void> {
    const ttlMin = Math.round(this.config.get('OTP_TTL_SECONDS') / 60);
    if (channel === 'SMS') {
      await this.sms.send(identifier, `fitlo code: ${code} (valid ${ttlMin}m) | کد ورود: ${code}`);
      return;
    }
    const subject = 'fitlo login code | کد ورود فیتلو';
    await this.email.send({
      to: identifier,
      subject,
      text: `Your fitlo login code is ${code}. It expires in ${ttlMin} minutes.`,
      html: `<p>Your fitlo login code is <strong>${code}</strong>.</p><p>It expires in ${ttlMin} minutes.</p>`,
    });
  }
}

export function createNotificationsService(config: AppConfig): NotificationsService {
  // Only the mock providers ship today; real vendors plug in here by env without
  // touching the auth flow.
  return new NotificationsService(new MockSmsProvider(), new MockEmailProvider(), config);
}
