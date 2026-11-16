import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsTimeZone } from '../../../common/decorators/is-time-zone.decorator.js';
import { trim } from '../../../common/transforms/trim.transform.js';
import { DEFAULT_TIME_ZONE } from '../entities/room.entity.js';

export const MAX_CAPACITY = 500;

export class CreateRoomDto {
  @ApiProperty({ example: 'Sala Andes', maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'Indica el nombre de la sala.' })
  @MaxLength(80, { message: 'El nombre admite como máximo 80 caracteres.' })
  name: string;

  @ApiProperty({ example: 8, minimum: 1, maximum: MAX_CAPACITY })
  @IsInt({ message: 'La capacidad debe ser un número entero.' })
  @Min(1, { message: 'La capacidad debe ser al menos 1.' })
  @Max(MAX_CAPACITY, {
    message: `La capacidad no puede superar ${MAX_CAPACITY}.`,
  })
  capacity: number;

  @ApiProperty({ example: 'Oficina Centro, planta 2', maxLength: 120 })
  @Transform(trim)
  @IsString({ message: 'La ubicación debe ser texto.' })
  @IsNotEmpty({ message: 'Indica la ubicación.' })
  @MaxLength(120, {
    message: 'La ubicación admite como máximo 120 caracteres.',
  })
  location: string;

  @ApiPropertyOptional({
    example: DEFAULT_TIME_ZONE,
    description: 'IANA time zone',
  })
  @IsOptional()
  @IsTimeZone({ message: 'La zona horaria no es válida.' })
  timezone?: string;
}
