import {
  HttpStatus,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import type { FieldError } from '../interfaces/api-error.interface.js';

/** Aplana los errores de class-validator (incluidos anidados) a `{ field, message }`, uno por campo. */
function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints
      ? [{ field, message: Object.values(e.constraints)[0] }]
      : [];
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

/** ValidationPipe global: whitelist estricta y 400 VALIDATION_ERROR con el detalle por campo. */
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
