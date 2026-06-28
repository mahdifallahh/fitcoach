import { Global, Logger, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/config.module';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './notifications.constants';
import { NotificationsService } from './notifications.service';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { MockEmailProvider } from './providers/mock-email.provider';
import { EmailProvider, SmsProvider } from './providers/provider.interfaces';

/**
 * Selects provider implementations from env. Add real providers (vendor SMS,
 * SMTP) here keyed by their env value — the rest of the app is unaffected.
 */
function createSmsProvider(config: AppConfigService): SmsProvider {
  const choice = config.get('SMS_PROVIDER');
  switch (choice) {
    case 'mock':
      return new MockSmsProvider();
    default:
      new Logger('NotificationsModule').warn(
        `Unknown SMS_PROVIDER "${choice}", falling back to mock`,
      );
      return new MockSmsProvider();
  }
}

function createEmailProvider(config: AppConfigService): EmailProvider {
  const choice = config.get('EMAIL_PROVIDER');
  switch (choice) {
    case 'mock':
      return new MockEmailProvider();
    default:
      new Logger('NotificationsModule').warn(
        `Unknown EMAIL_PROVIDER "${choice}", falling back to mock`,
      );
      return new MockEmailProvider();
  }
}

@Global()
@Module({
  providers: [
    NotificationsService,
    { provide: SMS_PROVIDER, useFactory: createSmsProvider, inject: [AppConfigService] },
    { provide: EMAIL_PROVIDER, useFactory: createEmailProvider, inject: [AppConfigService] },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
