import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { trim } from '../../../common/transforms/trim.transform.js';
import { ReservationStatus } from '../enums/reservation-status.enum.js';
import { SortedPaginationQueryDto } from './sorted-pagination-query.dto.js';
import {
  RESERVATION_SCOPES,
  type ReservationScope,
} from './my-reservations-query.dto.js';

/** Admin listing: `GET /reservations?page&pageSize&search&status&scope&roomId`. */
export class ListReservationsQueryDto extends SortedPaginationQueryDto {
  /** Case-insensitive match on title, room name, user name or email. */
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'reunion',
    description:
      'Busca en título, sala, nombre y email; ignora mayúsculas y tildes',
  })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'La búsqueda debe ser texto.' })
  @MaxLength(100, { message: 'La búsqueda admite como máximo 100 caracteres.' })
  search?: string;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    description: 'Filtra por estado',
  })
  @IsOptional()
  @IsIn(Object.values(ReservationStatus), {
    message: 'status debe ser active o cancelled.',
  })
  status?: ReservationStatus;

  /** upcoming = not finished yet; past = already finished (any status). */
  @ApiPropertyOptional({
    enum: RESERVATION_SCOPES,
    description:
      '`upcoming` = aún no terminó; `past` = ya terminó (cualquier estado)',
  })
  @IsOptional()
  @IsIn(RESERVATION_SCOPES, { message: 'scope debe ser upcoming o past.' })
  scope?: ReservationScope;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por sala' })
  @IsOptional()
  @IsUUID('all', { message: 'Elige una sala válida.' })
  roomId?: string;
}
