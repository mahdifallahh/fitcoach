import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvVars, validateEnv } from './env.validation';

/**
 * Typed wrapper over `ConfigService`. Inject this everywhere instead of reading
 * `process.env` directly — keeps env access centralized and type-safe.
 */
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  get<K extends keyof EnvVars>(key: K): EnvVars[K] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [
    {
      provide: AppConfigService,
      useFactory: (config: ConfigService<EnvVars, true>) => new AppConfigService(config),
      inject: [ConfigService],
    },
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}
