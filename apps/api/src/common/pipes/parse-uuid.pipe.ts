import { HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';

/**
 * Validates a UUID route param. A malformed id is a client error (400 VALIDATION_ERROR);
 * a well-formed id that does not exist is a 404, raised by the service.
 */
export function parseUuid(field = 'id') {
  return new ParseUUIDPipe({
    exceptionFactory: () =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Revisa los datos enviados.',
        [{ field, message: 'El identificador no es válido.' }],
      ),
  });
}
