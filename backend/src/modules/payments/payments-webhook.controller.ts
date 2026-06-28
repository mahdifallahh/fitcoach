import { Controller, Get, Headers, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

/** Gateway-facing endpoints (no auth): ZarinPal redirect + Stripe webhook. */
@ApiExcludeController()
@Controller()
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('coach/billing/zarinpal/callback')
  async zarinpalCallback(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Query('locale') locale: string | undefined,
    @Res() res: Response,
  ) {
    const url = await this.payments.handleZarinpalCallback(authority, status, locale === 'en' ? 'en' : 'fa');
    res.redirect(url);
  }

  @Public()
  @Post('payments/stripe/webhook')
  @HttpCode(200)
  async stripeWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    await this.payments.handleStripeWebhook((req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(''), signature);
    return { received: true };
  }
}
