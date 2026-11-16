import {
  HttpStatus,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import type { FieldError } from '../interfaces/api-error.interface.js';

/** Flattens class-validator errors (including nested ones) into `{ field, message }`, one per field. */
function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints
      ? [{ field, message: Object.values(e.constraints)[0] }]
      : [];
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

/** Global ValidationPipe: strict whitelist and 400 VALIDATION_ERROR with per-field details. */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Revisa los datos enviados.',
        flatten(errors),
      ),
  });
}
