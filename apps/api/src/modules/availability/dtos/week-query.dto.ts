import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator.js';

export class WeekQueryDto {
  @ApiProperty({ format: 'uuid', description: 'Id de la sala' })
  @IsUUID('all', { message: 'Elige una sala válida.' })
  roomId: string;

  /** Any day of the week to show; the response always covers Monday to Sunday. */
  @ApiProperty({
    example: '2026-11-20',
    description: 'Cualquier día de la semana a mostrar (AAAA-MM-DD)',
  })
  @IsDateOnly({ message: 'Indica una fecha válida (AAAA-MM-DD).' })
  date: string;
}
