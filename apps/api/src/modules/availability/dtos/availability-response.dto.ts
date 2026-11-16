import { ApiProperty } from '@nestjs/swagger';
import { RoomResponseDto } from '../../rooms/dtos/room-response.dto.js';

export class BusySlotDto {
  @ApiProperty({ format: 'uuid', description: 'Id de la reserva' })
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

  @ApiProperty({ format: 'uuid', description: 'Quién reservó' })
  userId: string;

  @ApiProperty({ example: 'Ana Pérez' })
  userName: string;
}

export class RoomAvailabilityDto {
  @ApiProperty({ type: RoomResponseDto })
  room: RoomResponseDto;

  @ApiProperty({
    type: [BusySlotDto],
    description: 'Franjas ocupadas ese día, de la más temprana a la más tardía',
  })
  reservations: BusySlotDto[];
}

export class AvailabilityResponseDto {
  @ApiProperty({ example: '2026-11-20' })
  date: string;

  @ApiProperty({
    type: [RoomAvailabilityDto],
    description:
      'Una entrada por sala activa (filtrada por capacidad mínima si se indicó)',
  })
  rooms: RoomAvailabilityDto[];
}

export class WeekDayDto {
  @ApiProperty({
    example: '2026-11-16',
    description: 'Día en la zona horaria de la sala',
  })
  date: string;

  @ApiProperty({ type: [BusySlotDto] })
  reservations: BusySlotDto[];
}

export class WeekResponseDto {
  @ApiProperty({ type: RoomResponseDto })
  room: RoomResponseDto;

  @ApiProperty({ example: '2026-11-16', description: 'Lunes de la semana' })
  weekStart: string;

  @ApiProperty({
    type: [WeekDayDto],
    description: 'Siete días, de lunes a domingo',
  })
  days: WeekDayDto[];
}
