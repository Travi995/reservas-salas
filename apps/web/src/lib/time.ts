// Time rules from the brief (section 4), replicated in the frontend for immediate feedback.
// The authoritative validation lives in the backend.

export const MIN_MINUTES = 15
export const MAX_MINUTES = 4 * 60

/** "HH:mm" → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Current date and time in an IANA time zone: { date: "YYYY-MM-DD", minutes }. */
export function nowIn(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

/** true if the start has already passed (or is right now) in the room's time zone. */
export function isInPast(date: string, startTime: string, timeZone: string, now = new Date()): boolean {
  const current = nowIn(timeZone, now)
  return date < current.date || (date === current.date && toMinutes(startTime) <= current.minutes)
}

export interface SlotInput {
  date: string
  startTime: string
  endTime: string
}

/** Returns the first business error, or null if the time slot is valid. */
export function validateSlot(slot: SlotInput, timeZone: string, now = new Date()): string | null {
  if (!slot.date || !slot.startTime || !slot.endTime) return 'Indica fecha, hora de inicio y hora de fin.'
  const start = toMinutes(slot.startTime)
  const end = toMinutes(slot.endTime)
  if (end <= start) return 'La hora de fin tiene que ser posterior a la de inicio.'

  if (isInPast(slot.date, slot.startTime, timeZone, now)) return 'No se puede reservar en el pasado.'

  const duration = end - start
  if (duration < MIN_MINUTES) return 'La reserva debe durar al menos 15 minutos.'
  if (duration > MAX_MINUTES) return 'La reserva no puede durar más de 4 horas.'
  return null
}

/** Today's date (browser local time) as "YYYY-MM-DD". */
export function todayISO(now = new Date()): string {
  return nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone, now).date
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  )
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(iso),
  )
}

/** Minutes since midnight of an instant, in the room's time zone. */
export function minutesOfDay(iso: string, timeZone: string): number {
  return nowIn(timeZone, new Date(iso)).minutes
}

export function formatLongDate(date: string): string {
  // date "YYYY-MM-DD" → noon UTC to avoid day shifts.
  return new Intl.DateTimeFormat('es', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00Z`))
}
