import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoachProfileModule } from './modules/coach-profile/coach-profile.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { StudentsModule } from './modules/students/students.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PublicCoachModule } from './modules/public-coach/public-coach.module';
import { ProgramRequestsModule } from './modules/program-requests/program-requests.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    NotificationsModule,
    StorageModule,
    UsersModule,
    AuthModule,
    CoachProfileModule,
    CategoriesModule,
    ExercisesModule,
    StudentsModule,
    ProgramsModule,
    PdfModule,
    SubscriptionsModule,
    PaymentsModule,
    PublicCoachModule,
    ProgramRequestsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Global guards run in this order: throttling → auth → roles → subscription gating.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
})
export class AppModule {}
