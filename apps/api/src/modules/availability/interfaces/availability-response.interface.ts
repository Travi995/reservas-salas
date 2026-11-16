import type { Room } from '../../rooms/entities/room.entity.js';

export interface BusySlot {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  userId: string;
  userName: string;
}

/** One room, Monday to Sunday, every day in the room's own time zone. */
export interface WeekResponse {
  room: Room;
  weekStart: string;
  days: { date: string; reservations: BusySlot[] }[];
}

export interface AvailabilityResponse {
  date: string;
  rooms: { room: Room; reservations: BusySlot[] }[];
}
