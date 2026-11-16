import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_WEEKS, MIN_WEEKS } from '../recurrence.js';
import { CreateReservationDto } from './create-reservation.dto.js';

/** Weekly series: `date` is the first occurrence, repeated on the same weekday for `weeks` weeks. */
export class CreateRecurringReservationDto extends CreateReservationDto {
  @ApiProperty({
    minimum: MIN_WEEKS,
    maximum: MAX_WEEKS,
    example: 4,
    description: 'Cuántas semanas dura la serie, contando la primera',
  })
  @IsInt({ message: 'Indica cuántas semanas como número entero.' })
  @Min(MIN_WEEKS, { message: `Una serie tiene al menos ${MIN_WEEKS} semanas.` })
  @Max(MAX_WEEKS, {
    message: `Una serie puede durar como máximo ${MAX_WEEKS} semanas.`,
  })
  weeks: number;
}
