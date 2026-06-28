import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsService } from './payments.service';
import { BillingController } from './billing.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { ZarinpalProvider } from './providers/zarinpal.provider';
import { StripeProvider } from './providers/stripe.provider';

@Module({
  imports: [SubscriptionsModule],
  controllers: [BillingController, PaymentsWebhookController],
  providers: [PaymentsService, ZarinpalProvider, StripeProvider],
})
export class PaymentsModule {}
