import { MetricsService } from './metrics.service.js';

describe('MetricsService', () => {
  it('counts requests by status class and aggregates latency per route', () => {
    const metrics = new MetricsService();
    metrics.record('GET /api/v1/rooms', 200, 10);
    metrics.record('GET /api/v1/rooms', 200, 30);
    metrics.record('POST /api/v1/reservations', 409, 5);
    metrics.record('POST /api/v1/reservations', 500, 7);

    const snap = metrics.snapshot();
    expect(snap.requests).toEqual({
      total: 4,
      byStatus: { '2xx': 2, '3xx': 0, '4xx': 1, '5xx': 1 },
    });
    expect(snap.routes).toEqual([
      { route: 'GET /api/v1/rooms', count: 2, errors: 0, avgMs: 20, maxMs: 30 },
      {
        route: 'POST /api/v1/reservations',
        count: 2,
        errors: 1,
        avgMs: 6,
        maxMs: 7,
      },
    ]);
  });
});
