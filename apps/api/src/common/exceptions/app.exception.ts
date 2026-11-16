import { HttpException, HttpStatus } from '@nestjs/common';
import type {
  ApiErrorBody,
  FieldError,
} from '../interfaces/api-error.interface.js';

/**
 * Domain exception with a stable code and a user-facing message.
 * Every expected API error is thrown with this class.
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
