import { Logger } from '@nestjs/common';
import { SmsProvider } from './provider.interfaces';

/** Dev SMS provider — logs the message instead of sending. */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  private readonly logger = new Logger('MockSmsProvider');

  async send(to: string, message: string): Promise<void> {
    this.logger.log(`\n──────── SMS (mock) ────────\n  to:  ${to}\n  msg: ${message}\n────────────────────────────`);
  }
}
