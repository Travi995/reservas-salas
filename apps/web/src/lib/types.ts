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
  room: Room
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface Availability {
  date: string
  rooms: { room: Room; reservations: ReservationSlot[] }[]
}

export interface MyReservations {
  upcoming: Reservation[]
  past: Reservation[]
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
