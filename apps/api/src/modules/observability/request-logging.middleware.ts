import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import type { MetricsService } from './metrics.service.js';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id.js';

export interface RequestLoggingOptions {
  /** Write one log line per request (disabled in tests to keep the output clean). */
  log: boolean;
  /** `json`: one JSON object per line (for log collectors). `pretty`: readable line for development. */
  format: 'pretty' | 'json';
}

/** Route pattern once Express has matched it; unmatched URLs are grouped to avoid unbounded keys. */
function routeOf(req: Request): string {
  const path = req.route?.path as string | undefined;
  return `${req.method} ${path ? `${req.baseUrl}${path}` : '(unmatched)'}`;
}

/**
 * Express middleware: assigns a request id (also returned in `X-Request-Id`), and when the
 * response finishes records metrics and logs method, path, status, duration and user.
 */
export function requestLogging(
  metrics: MetricsService,
  options: RequestLoggingOptions,
) {
  const logger = new Logger('HTTP');

  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    res.locals.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      metrics.record(routeOf(req), res.statusCode, durationMs);
      if (!options.log) return;

      const userId = (req as Request & { user?: AuthUser }).user?.id;
      const entry = {
        requestId,
        method: req.method,
        // Path only: the query string may carry search terms or emails.
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        userId: userId ?? null,
      };
      const message =
        options.format === 'json'
          ? entry
          : `${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms reqId=${requestId}${userId ? ` user=${userId}` : ''}`;

      if (res.statusCode >= 500) logger.error(message);
      else if (res.statusCode >= 400) logger.warn(message);
      else logger.log(message);
    });

    next();
  };
}
