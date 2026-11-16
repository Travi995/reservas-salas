import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SortedPaginationQueryDto } from './sorted-pagination-query.dto.js';

export const RESERVATION_SCOPES = ['upcoming', 'past'] as const;
export type ReservationScope = (typeof RESERVATION_SCOPES)[number];

/** `GET /reservations/me?scope=upcoming&page=1&pageSize=10`. */
export class MyReservationsQueryDto extends SortedPaginationQueryDto {
  @ApiPropertyOptional({
    enum: RESERVATION_SCOPES,
    default: 'upcoming',
    description:
      '`upcoming` (la más próxima primero) o `past` (la más reciente primero)',
  })
  @IsOptional()
  @IsIn(RESERVATION_SCOPES, { message: 'scope debe ser upcoming o past.' })
  scope: ReservationScope = 'upcoming';
}
