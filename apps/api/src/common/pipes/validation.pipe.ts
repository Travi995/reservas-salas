import {
  HttpStatus,
  ValidationPipe,
  type ArgumentMetadata,
  type ValidationError,
} from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import type { FieldError } from '../interfaces/api-error.interface.js';

const NOT_ALLOWED = 'Este campo no está permitido.';

/**
 * One message per field. class-validator lists constraints from the bottom decorator up, so the
 * LAST one is the topmost decorator: the type check (`@IsInt`, `@IsString`…). That way `pageSize=abc`
 * says "debe ser un número entero" instead of a misleading range message.
 */
function pickMessage(constraints: Record<string, string>): string {
  if (constraints.whitelistValidation) return NOT_ALLOWED;
  const messages = Object.values(constraints);
  return messages[messages.length - 1];
}

/** Flattens class-validator errors (including nested ones) into `{ field, message }`, one per field. */
function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints
      ? [{ field, message: pickMessage(e.constraints) }]
      : [];
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

/** Paths of every string that contains a NUL byte (Postgres rejects them with a 500). */
function nulFields(value: unknown, path = ''): string[] {
  if (typeof value === 'string') return value.includes('\u0000') ? [path] : [];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      nulFields(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

function validationError(details: FieldError[]) {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    'Revisa los datos enviados.',
    details,
  );
}

/** Rejects NUL bytes before anything reaches the database, then validates as usual. */
class AppValidationPipe extends ValidationPipe {
  override async transform(value: unknown, metadata: ArgumentMetadata) {
    const fields = nulFields(
      value,
      metadata.type === 'param' ? (metadata.data ?? '') : '',
    );
    if (fields.length) {
      throw validationError(
        fields.map((field) => ({
          field,
          message: 'El texto contiene caracteres no válidos.',
        })),
      );
    }
    return super.transform(value, metadata) as Promise<unknown>;
  }
}

/** Global ValidationPipe: strict whitelist and 400 VALIDATION_ERROR with per-field details. */
export function createValidationPipe() {
  return new AppValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => validationError(flatten(errors)),
  });
}
