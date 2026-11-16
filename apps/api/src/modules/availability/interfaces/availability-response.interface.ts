import type { Room } from '../../rooms/entities/room.entity.js';

export interface BusySlot {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  userId: string;
  userName: string;
}

export interface AvailabilityResponse {
  date: string;
  rooms: { room: Room; reservations: BusySlot[] }[];
}
