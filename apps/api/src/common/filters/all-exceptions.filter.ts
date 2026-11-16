import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '../interfaces/api-error.interface.js';
import { AppException } from '../exceptions/app.exception.js';

/** Default code and message for Nest/Express HTTP exceptions that are not AppException. */
const DEFAULTS: Partial<Record<number, { code: string; message: string }>> = {
  400: { code: 'BAD_REQUEST', message: 'La petición no es válida.' },
  401: { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' },
  403: { code: 'FORBIDDEN', message: 'No tienes permiso para hacer esto.' },
  404: { code: 'NOT_FOUND', message: 'El recurso no existe.' },
  405: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' },
  409: {
    code: 'CONFLICT',
    message: 'La operación entra en conflicto con datos existentes.',
  },
  413: {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'La petición es demasiado grande.',
  },
  415: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'Formato no soportado. Usa JSON.',
  },
  422: {
    code: 'UNPROCESSABLE_ENTITY',
    message: 'La operación no cumple las reglas de negocio.',
  },
  429: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiadas peticiones. Inténtalo más tarde.',
  },
};

/**
 * Converts any error into the unified format `{ error: { code, message, details? } }`.
 * Unexpected errors return 500 without leaking internal details and are logged.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const { status, body } = this.toResponse(
      exception,
      http.getRequest<Request>(),
      res,
    );
    res.status(status).json(body);
  }

  private toResponse(
    exception: unknown,
    req?: Request,
    res?: Response,
  ): {
    status: number;
    body: ApiErrorBody;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        body: exception.getResponse() as ApiErrorBody,
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const fallback = DEFAULTS[status] ?? {
        code: `HTTP_${status}`,
        message: exception.message,
      };
      return { status, body: { error: fallback } };
    }
    // The request id (also sent back in X-Request-Id) links this stack trace to the request log line.
    const requestId = (res?.locals?.requestId as string | undefined) ?? '-';
    this.logger.error(
      `${req?.method ?? ''} ${req?.originalUrl?.split('?')[0] ?? ''} reqId=${requestId}\n${
        exception instanceof Error ? exception.stack : String(exception)
      }`,
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ha ocurrido un error inesperado. Inténtalo más tarde.',
        },
      },
    };
  }
}
