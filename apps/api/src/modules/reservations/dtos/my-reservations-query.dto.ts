import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

export const RESERVATION_SCOPES = ['upcoming', 'past'] as const;
export type ReservationScope = (typeof RESERVATION_SCOPES)[number];

/** `GET /reservations/me?scope=upcoming&page=1&pageSize=10`. */
export class MyReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RESERVATION_SCOPES, default: 'upcoming' })
  @IsOptional()
  @IsIn(RESERVATION_SCOPES, { message: 'scope debe ser upcoming o past.' })
  scope: ReservationScope = 'upcoming';
}
