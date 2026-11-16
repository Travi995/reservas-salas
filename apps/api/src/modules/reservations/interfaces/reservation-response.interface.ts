import type { Paginated } from '../../../common/pagination/paginated.js';
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
  /** Who cancelled it (the owner or an admin); null while active or when unknown. */
  cancelledBy: { id: string; name: string } | null;
  room: Room;
}

/** A page of «my reservations». `activeItems` = how many in this scope are not cancelled (the tab counter). */
export interface MyReservationsPage extends Paginated<ReservationResponse> {
  meta: Paginated<ReservationResponse>['meta'] & { activeItems: number };
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
