import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator.js';
import { trim } from '../../../common/transforms/trim.transform.js';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Date and times are wall-clock values in the room's time zone, as the user types them (ADR-0009). */
export class CreateReservationDto {
  @ApiProperty({ format: 'uuid', description: 'Id de la sala (`GET /rooms`)' })
  @IsUUID('all', { message: 'Elige una sala válida.' })
  roomId: string;

  @ApiProperty({
    example: '2026-11-20',
    description: 'Día, en la zona horaria de la sala (AAAA-MM-DD)',
  })
  @IsDateOnly({ message: 'Indica una fecha válida (AAAA-MM-DD).' })
  date: string;

  @ApiProperty({
    example: '10:00',
    description: 'Hora de inicio local de la sala (HH:mm, 24 h)',
  })
  @Matches(HH_MM, { message: 'Indica una hora válida (HH:mm).' })
  startTime: string;

  @ApiProperty({
    example: '11:00',
    description:
      'Hora de fin local de la sala (HH:mm). Debe ser posterior al inicio; duración de 15 min a 4 h',
  })
  @Matches(HH_MM, { message: 'Indica una hora válida (HH:mm).' })
  endTime: string;

  @ApiProperty({
    example: 'Planificación semanal',
    maxLength: 120,
    description: 'Título de la reunión',
  })
  @Transform(trim)
  @IsString({ message: 'El título debe ser texto.' })
  @IsNotEmpty({ message: 'Pon un título a la reunión.' })
  @MaxLength(120, { message: 'El título admite como máximo 120 caracteres.' })
  title: string;
}
