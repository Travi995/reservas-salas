import { ApiProperty } from '@nestjs/swagger';
import { RoomResponseDto } from '../../rooms/dtos/room-response.dto.js';
import { ReservationStatus } from '../enums/reservation-status.enum.js';

export class CancelledByDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  name: string;
}

export class ReservationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Planificación semanal' })
  title: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-20T13:00:00.000Z',
    description: 'Inicio (UTC, incluido)',
  })
  startsAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-20T14:00:00.000Z',
    description: 'Fin (UTC, excluido)',
  })
  endsAt: Date;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.Active })
  status: ReservationStatus;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'Presente si es una ocurrencia de una serie semanal; `null` en reservas sueltas.',
  })
  seriesId: string | null;

  @ApiProperty({
    type: CancelledByDto,
    nullable: true,
    description:
      'Quién la canceló (el dueño o un admin). `null` mientras esté activa.',
  })
  cancelledBy: CancelledByDto | null;

  @ApiProperty({ type: RoomResponseDto })
  room: RoomResponseDto;
}

export class ReservationUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ana Pérez' })
  name: string;

  @ApiProperty({ example: 'ana@empresa.com' })
  email: string;
}

/** Row of the admin listing: the reservation plus who booked it. */
export class AdminReservationResponseDto extends ReservationResponseDto {
  @ApiProperty({ type: ReservationUserDto })
  user: ReservationUserDto;
}

export class PageMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({
    example: 23,
    description: 'Total de elementos que cumplen el filtro',
  })
  totalItems: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class MyReservationsMetaDto extends PageMetaDto {
  @ApiProperty({
    example: 4,
    description:
      'Cuántas de esa pestaña (próximas o pasadas) no están canceladas: el contador de la pestaña.',
  })
  activeItems: number;
}

export class MyReservationsPageDto {
  @ApiProperty({ type: [ReservationResponseDto] })
  items: ReservationResponseDto[];

  @ApiProperty({ type: MyReservationsMetaDto })
  meta: MyReservationsMetaDto;
}

export class AdminReservationsPageDto {
  @ApiProperty({ type: [AdminReservationResponseDto] })
  items: AdminReservationResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}

export class RecurringReservationResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador común de todas las ocurrencias',
  })
  seriesId: string;

  @ApiProperty({
    type: [ReservationResponseDto],
    description:
      'Todas las ocurrencias creadas, de la más próxima a la más lejana',
  })
  reservations: ReservationResponseDto[];
}
