import { minutesOfDay } from '../../lib/time'
import type { ReservationSlot } from '../../lib/types'

/** Monday (ISO week start) of the week containing `date`. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const DEFAULT_FROM = 8 * 60
const DEFAULT_TO = 20 * 60

/** Visible hours: 08:00–20:00, widened to whole hours if any reservation falls outside. */
export function visibleRange(slots: ReservationSlot[], timeZone: string) {
  const starts = slots.map((s) => minutesOfDay(s.startsAt, timeZone))
  const ends = slots.map((s) => minutesOfDay(s.endsAt, timeZone) || 24 * 60)
  return {
    from: Math.floor(Math.min(DEFAULT_FROM, ...starts) / 60) * 60,
    to: Math.ceil(Math.max(DEFAULT_TO, ...ends) / 60) * 60,
  }
}

/** Vertical position of a slot inside a day column, in minutes from the top of the range. */
export function slotBox(slot: ReservationSlot, timeZone: string, from: number) {
  const start = minutesOfDay(slot.startsAt, timeZone)
  const end = minutesOfDay(slot.endsAt, timeZone) || 24 * 60 // ends at midnight
  return { top: start - from, height: end - start }
}

/** "HH:mm" for minutes since midnight. */
export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
