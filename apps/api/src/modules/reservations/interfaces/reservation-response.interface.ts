import type { Room } from '../../rooms/entities/room.entity.js';
import type { ReservationStatus } from '../enums/reservation-status.enum.js';

export interface ReservationResponse {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  /** Set when the reservation is one occurrence of a recurring series. */
  seriesId: string | null;
  room: Room;
}

/** 201 of POST /reservations/recurring: every occurrence, soonest first. */
export interface RecurringReservationResponse {
  seriesId: string;
  reservations: ReservationResponse[];
}

/** Admin listing row: the reservation plus who booked it. */
export interface AdminReservationResponse extends ReservationResponse {
  user: { id: string; name: string; email: string };
}
