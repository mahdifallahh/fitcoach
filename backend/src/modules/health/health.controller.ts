import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness — used by the container healthcheck. Fast, no dependency calls. */
  @Public()
  @Get()
  live() {
    return this.health.live();
  }

  /** Readiness — verifies DB + Redis. Returns 503 when a dependency is down. */
  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.ready();
    res.status(report.status === 'ok' ? 200 : 503);
    return report;
  }
}
