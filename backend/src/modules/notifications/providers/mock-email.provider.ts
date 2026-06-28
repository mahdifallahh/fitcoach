import { Logger } from '@nestjs/common';
import { EmailProvider } from './provider.interfaces';

/** Dev email provider — logs the message instead of sending. */
export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';
  private readonly logger = new Logger('MockEmailProvider');

  async send(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
    this.logger.log(
      `\n──────── EMAIL (mock) ────────\n  to:      ${input.to}\n  subject: ${input.subject}\n  text:    ${input.text}\n──────────────────────────────`,
    );
  }
}
