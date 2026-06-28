import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

type Check = 'up' | 'down';

export interface HealthReport {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  services: {
    database: Check;
    redis: Check;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness — process is up. */
  live(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Readiness — dependencies reachable. */
  async ready(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const allUp = database === 'up' && redis === 'up';
    return {
      status: allUp ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services: { database, redis },
    };
  }

  private async checkDb(): Promise<Check> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<Check> {
    try {
      return (await this.redis.ping()) ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
