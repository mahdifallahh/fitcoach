import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.module';

async function bootstrap(): Promise<void> {
  // rawBody: keep the unparsed body for Stripe webhook signature verification.
  const app = await NestFactory.create(AppModule, { bufferLogs: false, rawBody: true });
  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // All routes are served under /api
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.enableCors({
    origin: config.get('FRONTEND_ORIGIN'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FitCoach API')
    .setDescription('Fitness Coach & Training Program Platform — REST API')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`FitCoach API listening on http://localhost:${port}/api`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
