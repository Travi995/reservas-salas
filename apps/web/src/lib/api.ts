import type {
  Availability,
  AuthResponse,
  MyReservations,
  Reservation,
  ReservationInput,
  Room,
  RoomInput,
  User,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'reservas.token'

export interface FieldError {
  field: string
  message: string
}

/** Error de la API con el formato único `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: FieldError[]

  constructor(status: number, code: string, message: string, details: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

let onUnauthorized: () => void = () => {}
/** El AuthProvider registra aquí qué hacer ante un 401 (cerrar sesión). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos enviados.',
  401: 'Tu sesión no es válida. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscas.',
  409: 'La operación entra en conflicto con datos existentes.',
  422: 'La operación no cumple las reglas de reserva.',
}

export async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null)
  const err = body?.error
  const message =
    typeof err?.message === 'string' && err.message
      ? err.message
      : (FALLBACK_MESSAGES[res.status] ?? 'Ha ocurrido un error inesperado. Inténtalo más tarde.')
  return new ApiError(res.status, err?.code ?? 'UNKNOWN', message, Array.isArray(err?.details) ? err.details : [])
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión.')
  }

  if (!res.ok) {
    const error = await parseError(res)
    // 401 en una ruta protegida = sesión caducada. En login es «credenciales incorrectas».
    if (res.status === 401 && token) onUnauthorized()
    throw error
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: json({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: json({ name, email, password }) }),
  me: () => request<User>('/auth/me'),

  rooms: (includeInactive = false) => request<Room[]>(`/rooms${includeInactive ? '?includeInactive=true' : ''}`),
  createRoom: (input: RoomInput) => request<Room>('/rooms', { method: 'POST', body: json(input) }),
  updateRoom: (id: string, input: Partial<RoomInput & { isActive: boolean }>) =>
    request<Room>(`/rooms/${id}`, { method: 'PATCH', body: json(input) }),

  availability: (date: string, minCapacity?: number) => {
    const q = new URLSearchParams({ date })
    if (minCapacity) q.set('minCapacity', String(minCapacity))
    return request<Availability>(`/availability?${q}`)
  },

  createReservation: (input: ReservationInput) =>
    request<Reservation>('/reservations', { method: 'POST', body: json(input) }),
  myReservations: () => request<MyReservations>('/reservations/me'),
  cancelReservation: (id: string) => request<Reservation>(`/reservations/${id}/cancel`, { method: 'POST' }),
}
