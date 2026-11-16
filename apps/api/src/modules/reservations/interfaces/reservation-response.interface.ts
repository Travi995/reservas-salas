import type { Room } from '../../rooms/entities/room.entity.js';
import type { ReservationStatus } from '../enums/reservation-status.enum.js';

export interface ReservationResponse {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  room: Room;
}

export interface MyReservationsResponse {
  upcoming: ReservationResponse[];
  past: ReservationResponse[];
}
