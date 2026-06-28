import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('billing')
@Roles(Role.COACH)
@Controller('coach/billing')
export class BillingController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  billing(@CurrentUser('id') coachId: string) {
    return this.payments.getBilling(coachId);
  }

  @Post('checkout')
  checkout(@CurrentUser('id') coachId: string, @Body() dto: CheckoutDto) {
    return this.payments.createCheckout(coachId, dto.plan, dto.gateway, dto.locale ?? 'fa');
  }

  /** Dev-only: simulate a successful payment (404 in production). */
  @Post('dev/complete/:paymentId')
  devComplete(@CurrentUser('id') coachId: string, @Param('paymentId') paymentId: string) {
    return this.payments.devComplete(coachId, paymentId);
  }
}
