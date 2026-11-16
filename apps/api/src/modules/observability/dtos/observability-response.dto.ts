import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'up' })
  database: string;
}

export class RequestsMetricsDto {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { '2xx': 100, '4xx': 19, '5xx': 1 },
    description: 'Peticiones por clase de estado',
  })
  byStatus: Record<string, number>;
}

export class RouteMetricsDto {
  @ApiProperty({ example: 'POST /reservations' })
  route: string;

  @ApiProperty({ example: 42 })
  count: number;

  @ApiProperty({ example: 5, description: 'Respuestas con estado 4xx o 5xx' })
  errors: number;

  @ApiProperty({ example: 12.4, description: 'Latencia media en ms' })
  avgMs: number;

  @ApiProperty({ example: 80.1, description: 'Latencia máxima en ms' })
  maxMs: number;
}

export class MetricsResponseDto {
  @ApiProperty({ type: String, format: 'date-time' })
  startedAt: string;

  @ApiProperty({ example: 3600 })
  uptimeSeconds: number;

  @ApiProperty({ type: RequestsMetricsDto })
  requests: RequestsMetricsDto;

  @ApiProperty({
    type: [RouteMetricsDto],
    description: 'Ordenadas de más a menos peticiones',
  })
  routes: RouteMetricsDto[];
}
