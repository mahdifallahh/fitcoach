import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/config.module';

/**
 * Thin wrapper around an ioredis client. Used for health checks now and for
 * caching hot reads (exercise library, categories, profiles) in later phases.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.get('REDIS_URL'), {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async ping(): Promise<boolean> {
    const res = await this.client.ping();
    return res === 'PONG';
  }

  /** JSON cache helper: get-or-compute with TTL (seconds). */
  async remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.client.get(key);
    if (cached) return JSON.parse(cached) as T;
    const value = await factory();
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  }

  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys);
  }

  /** Delete all keys matching a glob pattern (e.g. "exercises:coach:123:*"). */
  async invalidatePattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const pipeline = this.client.pipeline();
    let found = false;
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        found = true;
      }
    }
    if (found) await pipeline.exec();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
