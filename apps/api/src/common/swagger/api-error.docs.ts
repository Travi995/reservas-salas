import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/** Error for one field (only in validation errors). Documentation-only: mirrors `FieldError`. */
export class FieldErrorDto {
  @ApiProperty({ example: 'email', description: 'Campo que falla' })
  field: string;

  @ApiProperty({ example: 'Introduce un email válido.' })
  message: string;
}

export class ErrorBodyDto {
  @ApiProperty({
    example: 'ROOM_OVERLAP',
    description: 'Código estable, pensado para que el cliente decida qué hacer',
  })
  code: string;

  @ApiProperty({
    example: 'La sala ya está reservada de 10:00 a 11:00.',
    description: 'Mensaje en español, listo para mostrar al usuario',
  })
  message: string;

  @ApiPropertyOptional({
    type: [FieldErrorDto],
    description: 'Solo en errores de validación: qué campo falla y por qué',
  })
  details?: FieldErrorDto[];
}

/** Every error response of the API has exactly this shape. */
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}

export interface ErrorExample {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

/**
 * Documents one error status with the unified error body and one or more realistic examples
 * (several codes can share a status, e.g. 409 ROOM_OVERLAP and 409 ALREADY_CANCELLED).
 */
export function ApiError(
  status: number,
  description: string,
  ...examples: ErrorExample[]
) {
  const content =
    examples.length <= 1
      ? { example: { error: examples[0] } }
      : {
          examples: Object.fromEntries(
            examples.map((e) => [
              e.code,
              { summary: e.code, value: { error: e } },
            ]),
          ),
        };
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiResponse({
      status,
      description,
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(ErrorResponseDto) },
          ...content,
        },
      },
    }),
  );
}

const VALIDATION: ErrorExample = {
  code: 'VALIDATION_ERROR',
  message: 'Revisa los datos enviados.',
  details: [{ field: 'email', message: 'Introduce un email válido.' }],
};

/** 400: malformed body/query/path, with the field that fails in `details`. */
export const ApiValidationError = () =>
  ApiError(
    400,
    'Datos mal formados o inválidos. `details` indica qué campo falla.',
    VALIDATION,
  );

/** 401: missing, invalid or expired token. */
export const ApiUnauthorizedError = () =>
  ApiError(
    401,
    'Falta el token, no es válido o ha caducado.',
    { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesión.' },
    {
      code: 'INVALID_TOKEN',
      message: 'Tu sesión ha caducado o no es válida. Inicia sesión de nuevo.',
    },
  );

/** 403: the user is authenticated but not allowed. */
export const ApiForbiddenError = (
  description = 'Tu rol no permite esta operación.',
) =>
  ApiError(403, description, {
    code: 'FORBIDDEN',
    message: 'No tienes permiso para hacer esto.',
  });

export const ApiRoomNotFoundError = () =>
  ApiError(404, 'La sala no existe.', {
    code: 'ROOM_NOT_FOUND',
    message: 'La sala no existe.',
  });
