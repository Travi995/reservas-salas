import { HttpException, HttpStatus } from '@nestjs/common';
import type {
  ApiErrorBody,
  FieldError,
} from '../interfaces/api-error.interface.js';

/**
 * Excepción de dominio con código estable y mensaje para el usuario.
 * Todos los errores esperados de la API se lanzan con esta clase.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: FieldError[],
  ) {
    const body: ApiErrorBody = {
      error: { code, message, ...(details?.length ? { details } : {}) },
    };
    super(body, status);
  }
}
