import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaymentGateway, SubscriptionPlan } from '@prisma/client';

export class CheckoutDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @ApiProperty({ enum: PaymentGateway, description: 'ZARINPAL (IRR) or STRIPE (international)' })
  @IsEnum(PaymentGateway)
  gateway!: PaymentGateway;

  @ApiPropertyOptional({ enum: ['fa', 'en'] })
  @IsOptional()
  @IsIn(['fa', 'en'])
  locale?: 'fa' | 'en';
}
