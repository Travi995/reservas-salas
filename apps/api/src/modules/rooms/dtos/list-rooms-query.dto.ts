import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListRoomsQueryDto {
  /** Only honoured for admins; members always get active rooms. */
  @ApiPropertyOptional({
    description:
      'Incluye las salas desactivadas (solo tiene efecto para admin)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'includeInactive debe ser true o false.' })
  includeInactive?: boolean;
}
