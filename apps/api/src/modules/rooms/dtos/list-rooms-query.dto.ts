import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListRoomsQueryDto {
  /** Only honoured for admins; members always get active rooms. */
  @ApiPropertyOptional({ description: 'Include inactive rooms (admin only)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'includeInactive debe ser true o false.' })
  includeInactive?: boolean;
}
