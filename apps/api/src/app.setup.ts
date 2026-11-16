import type { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';

/** Every route lives under /api/v1 (versioned public contract, ADR-0009). */
export const API_PREFIX = 'api/v1';

/** Shared app configuration: used by main.ts and the e2e tests, so both exercise exactly the same setup. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
