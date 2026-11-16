import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import {
  ApiError,
  ApiForbiddenError,
  ApiUnauthorizedError,
} from '../../common/swagger/api-error.docs.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/enums/role.enum.js';
import {
  HealthResponseDto,
  MetricsResponseDto,
} from './dtos/observability-response.dto.js';
import { MetricsService } from './metrics.service.js';

@ApiTags('observability')
@Controller()
export class ObservabilityController {
  constructor(
    private readonly db: DataSource,
    private readonly metrics: MetricsService,
  ) {}

  /** 200 · 503. Liveness + database check, for a load balancer or uptime monitor. */
  @ApiOperation({
    summary: 'Estado del servicio',
    description:
      'Público. Comprueba que la API responde y que la base de datos contesta a un `SELECT 1`. Pensado para un balanceador o un monitor de disponibilidad.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiError(503, 'La base de datos no responde.', {
    code: 'DATABASE_UNAVAILABLE',
    message: 'La base de datos no responde.',
  })
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
  @ApiOperation({
    summary: 'Métricas básicas (admin)',
    description:
      'Solo `admin`. Peticiones por clase de estado y latencia media y máxima por ruta, desde que arrancó el proceso. Viven en memoria: se pierden al reiniciar.',
  })
  @ApiOkResponse({ type: MetricsResponseDto })
  @ApiUnauthorizedError()
  @ApiForbiddenError('Solo un admin puede ver las métricas.')
  @ApiBearerAuth()
  @Roles(Role.Admin)
  @Get('metrics')
  snapshot() {
    return this.metrics.snapshot();
  }
}
