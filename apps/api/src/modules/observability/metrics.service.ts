import { Injectable } from '@nestjs/common';

interface RouteStats {
  count: number;
  errors: number;
  totalMs: number;
  maxMs: number;
}

export interface MetricsSnapshot {
  startedAt: string;
  uptimeSeconds: number;
  requests: {
    total: number;
    byStatus: Record<'2xx' | '3xx' | '4xx' | '5xx', number>;
  };
  routes: Array<{
    route: string;
    count: number;
    errors: number;
    avgMs: number;
    maxMs: number;
  }>;
}

/**
 * Basic in-memory metrics (per process, reset on restart). Enough to see traffic, errors and
 * slow routes; with more time this would be exported to Prometheus/OpenTelemetry.
 */
@Injectable()
export class MetricsService {
  private readonly startedAt = new Date();
  private total = 0;
  private readonly byStatus = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  private readonly routes = new Map<string, RouteStats>();

  /** `route` is the route pattern (`GET /api/v1/rooms/:id`), not the raw URL, to keep cardinality low. */
  record(route: string, status: number, durationMs: number) {
    this.total++;
    const bucket =
      `${Math.min(Math.max(Math.floor(status / 100), 2), 5)}xx` as keyof typeof this.byStatus;
    this.byStatus[bucket]++;

    const stats = this.routes.get(route) ?? {
      count: 0,
      errors: 0,
      totalMs: 0,
      maxMs: 0,
    };
    stats.count++;
    if (status >= 500) stats.errors++;
    stats.totalMs += durationMs;
    stats.maxMs = Math.max(stats.maxMs, durationMs);
    this.routes.set(route, stats);
  }

  snapshot(now = new Date()): MetricsSnapshot {
    return {
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round(
        (now.getTime() - this.startedAt.getTime()) / 1000,
      ),
      requests: { total: this.total, byStatus: { ...this.byStatus } },
      routes: [...this.routes.entries()]
        .map(([route, s]) => ({
          route,
          count: s.count,
          errors: s.errors,
          avgMs: Math.round((s.totalMs / s.count) * 10) / 10,
          maxMs: Math.round(s.maxMs * 10) / 10,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
