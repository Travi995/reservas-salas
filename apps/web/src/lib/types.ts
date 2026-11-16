// API contract types (ADR-0009).
export type Role = 'admin' | 'member'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Room {
  id: string
  name: string
  capacity: number
  location: string
  timezone: string
  isActive: boolean
}

export interface ReservationSlot {
  id: string
  title: string
  startsAt: string
  endsAt: string
  userId: string
  userName: string
}

export interface Reservation {
  id: string
  title: string
  startsAt: string
  endsAt: string
  status: 'active' | 'cancelled'
  /** Shared by the occurrences of a weekly series; null for one-off reservations. */
  seriesId: string | null
  room: Room
}

/** 201 of POST /reservations/recurring. */
export interface RecurringReservationResult {
  seriesId: string
  reservations: Reservation[]
}

export interface AuthResponse {
  accessToken: string
  user: User
}

/** One room, Monday to Sunday, in the room's time zone (GET /availability/week). */
export interface WeekAvailability {
  room: Room
  weekStart: string
  days: { date: string; reservations: ReservationSlot[] }[]
}

export interface Availability {
  date: string
  rooms: { room: Room; reservations: ReservationSlot[] }[]
}

/** Admin listing row: the reservation plus who booked it. */
export interface AdminReservation extends Reservation {
  user: Pick<User, 'id' | 'name' | 'email'>
}

export type ReservationScope = 'upcoming' | 'past'
export type ReservationStatus = Reservation['status']

export interface PageMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Paginated list as the API returns it. The server does the paging; the client just asks for a page. */
export interface Paginated<T> {
  items: T[]
  meta: PageMeta
}

export interface PageParams {
  page?: number
  pageSize?: number
}

export interface AdminReservationsQuery extends PageParams {
  search?: string
  status?: ReservationStatus
  scope?: ReservationScope
  roomId?: string
}

export interface RoomInput {
  name: string
  capacity: number
  location: string
  timezone: string
}

export interface ReservationInput {
  roomId: string
  date: string
  startTime: string
  endTime: string
  title: string
}

/** Weekly series: `date` is the first occurrence, repeated for `weeks` weeks (2–12). */
export interface RecurringReservationInput extends ReservationInput {
  weeks: number
}
