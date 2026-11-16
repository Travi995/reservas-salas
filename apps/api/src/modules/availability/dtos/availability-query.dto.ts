import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator.js';
import { MAX_CAPACITY } from '../../rooms/dtos/create-room.dto.js';

export class AvailabilityQueryDto {
  /** Calendar day, interpreted in each room's own time zone. */
  @ApiProperty({
    example: '2026-11-20',
    description:
      'Día a consultar (AAAA-MM-DD), en la zona horaria de cada sala',
  })
  @IsDateOnly({ message: 'Indica una fecha válida (AAAA-MM-DD).' })
  date: string;

  @ApiPropertyOptional({
    example: 8,
    description:
      'Solo salas con capacidad para al menos esta cantidad de personas',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La capacidad mínima debe ser un número entero.' })
  @Min(1, { message: 'La capacidad mínima debe ser al menos 1.' })
  @Max(MAX_CAPACITY, {
    message: `La capacidad mínima no puede superar ${MAX_CAPACITY}.`,
  })
  minCapacity?: number;
}
