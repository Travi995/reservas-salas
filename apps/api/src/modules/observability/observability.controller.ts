import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/enums/role.enum.js';
import { MetricsService } from './metrics.service.js';

@ApiTags('observability')
@Controller()
export class ObservabilityController {
  constructor(
    private readonly db: DataSource,
    private readonly metrics: MetricsService,
  ) {}

  /** 200 · 503. Liveness + database check, for a load balancer or uptime monitor. */
  @Public()
  @Get('health')
  async health() {
    try {
      await this.db.query('SELECT 1');
    } catch {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'DATABASE_UNAVAILABLE',
        'La base de datos no responde.',
      );
    }
    return { status: 'ok', database: 'up' };
  }

  /** 200 · 401 · 403. Request counters and latency per route since the process started. */
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Get('metrics')
  snapshot() {
    return this.metrics.snapshot();
  }
}
