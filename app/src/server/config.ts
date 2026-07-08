import 'server-only';
import { z } from 'zod';

/**
 * Single source of truth for server environment variables. Validated lazily on
 * first access (never at import time, so `next build` doesn't fail on a machine
 * without a full server env). A failure throws a readable, aggregated message.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Object storage (S3 / MinIO)
  S3_ENDPOINT: z.string().min(1),
  S3_PUBLIC_ENDPOINT: z.string().min(1).optional(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  S3_BUCKET_AVATARS: z.string().default('avatars'),
  S3_BUCKET_GIFS: z.string().default('gifs'),
  S3_BUCKET_PDFS: z.string().default('pdfs'),
  S3_BUCKET_REQUESTS: z.string().default('requests'), // private (intake photos)

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000),

  // Auth / OTP
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  SMS_PROVIDER: z.string().default('mock'),
  EMAIL_PROVIDER: z.string().default('mock'),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('no-reply@fitlo.local'),

  // Payments
  ZARINPAL_MERCHANT_ID: z.string().optional(),
  ZARINPAL_SANDBOX: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // PDF (Puppeteer → system Chromium from the Docker image)
  PUPPETEER_EXECUTABLE_PATH: z.string().default('/usr/bin/chromium'),

  // App URLs / cookies. In the single-app world the API is same-origin, so the
  // public URL is just the app's origin.
  APP_PUBLIC_URL: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),
});

export type EnvVars = z.infer<typeof envSchema>;

/**
 * Typed accessor over validated env. Mirrors the old Nest `AppConfigService`
 * (`.get(key)` + `.isProduction`) so ported service bodies stay unchanged.
 */
export class AppConfig {
  constructor(private readonly env: EnvVars) {}

  get<K extends keyof EnvVars>(key: K): EnvVars[K] {
    return this.env[key];
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }
}

const g = globalThis as unknown as { __fitloConfig?: AppConfig };

export function getConfig(): AppConfig {
  if (g.__fitloConfig) return g.__fitloConfig;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  g.__fitloConfig = new AppConfig(parsed.data);
  return g.__fitloConfig;
}
