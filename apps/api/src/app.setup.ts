import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import type { Env } from './config/env.validation.js';
import { MetricsService } from './modules/observability/metrics.service.js';
import { requestLogging } from './modules/observability/request-logging.middleware.js';

/** Every route lives under /api/v1 (versioned public contract, ADR-0009). */
export const API_PREFIX = 'api/v1';

/** Shared app configuration: used by main.ts and the e2e tests, so both exercise exactly the same setup. */
export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // Security headers. The CSP only matters for HTML: it stays off outside production so Swagger UI (/docs) works.
  app.use(
    helmet({
      contentSecurityPolicy:
        config.get('NODE_ENV', { infer: true }) === 'production',
    }),
  );
  app.use(
    requestLogging(app.get(MetricsService), {
      log: config.get('NODE_ENV', { infer: true }) !== 'test',
      format: config.get('LOG_FORMAT', { infer: true }),
    }),
  );
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
