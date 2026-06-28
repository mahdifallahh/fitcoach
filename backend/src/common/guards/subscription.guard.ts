import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { REQUIRES_SUB_KEY } from '../decorators/requires-subscription.decorator';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

/**
 * Enforces `@RequiresActiveSubscription()`. Only coaches are gated; once their
 * trial/plan lapses, write endpoints return 402 while reads remain accessible.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRES_SUB_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user || user.role !== Role.COACH) return true;
    if (await this.subscriptions.isActive(user.id)) return true;

    throw new HttpException(
      {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your trial has ended. Subscribe to keep creating or editing.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
