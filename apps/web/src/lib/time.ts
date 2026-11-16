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

/** The browser's own IANA time zone. */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * "hora de Buenos Aires" when the room's zone differs from the browser's, so a time shown in room-local
 * time is never mistaken for the viewer's own; `null` when they match.
 */
export function zoneLabel(timeZone: string, viewerZone = browserTimeZone()): string | null {
  // Compare canonical ids: browsers report "America/Buenos_Aires" for "America/Argentina/Buenos_Aires".
  if (canonicalZone(timeZone) === canonicalZone(viewerZone)) return null
  return `hora de ${zoneCity(timeZone)}`
}

function canonicalZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en', { timeZone }).resolvedOptions().timeZone
  } catch {
    return timeZone
  }
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires": the readable part of an IANA id. */
export function zoneCity(timeZone: string): string {
  return timeZone.split('/').pop()!.replace(/_/g, ' ')
}

/** A real calendar date written as "YYYY-MM-DD" (rejects "basura", "18/11/2026", "2026-02-30"). */
export function isISODate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** Minutes since midnight → "HH:mm". */
export function fromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  )
}

/** "mar, 17 nov"; the year is added when it is not the current one («jue, 1 ene 2027»). */
export function formatDate(iso: string, timeZone: string, now = new Date()): string {
  const date = new Date(iso)
  const yearOf = (d: Date) => new Intl.DateTimeFormat('en', { timeZone, year: 'numeric' }).format(d)
  return new Intl.DateTimeFormat('es', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(yearOf(date) !== yearOf(now) ? { year: 'numeric' } : {}),
  }).format(date)
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

export const MIN_WEEKS = 2
export const MAX_WEEKS = 12

/** Dates of a weekly series: `first` and the same weekday for the next `weeks - 1` weeks (same rule as the API). */
export function weeklyDates(first: string, weeks: number): string[] {
  const start = new Date(`${first}T00:00:00Z`)
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + 7 * i)
    return d.toISOString().slice(0, 10)
  })
}

/** Plain date "YYYY-MM-DD" → "lun, 23 nov" (no time zone involved). */
export function formatPlainDate(date: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('es', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(`${date}T00:00:00Z`))
}
