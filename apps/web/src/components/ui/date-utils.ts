/**
 * Small local-time date helpers for the DatePicker. Dates travel as ISO strings
 * "YYYY-MM-DD" (same format as <input type="date">). Every Date is built with
 * `new Date(y, m, d)` and formatted back by hand: never `toISOString()`, which
 * converts to UTC and can shift the day.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

/** Parses "YYYY-MM-DD" to a local Date at midnight. Returns null when invalid. */
export function parseISODate(value: string | undefined | null): Date | null {
  if (!value) return null
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
  const date = new Date(y, m, d)
  // Rejects overflowing values such as 2026-02-31.
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null
  return date
}

/** Formats a Date as "YYYY-MM-DD" using its local fields. */
export function toISODate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISODate(): string {
  return toISODate(new Date())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Adds months keeping the day, clamped to the target month's length (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

/** Monday-based day index: 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -weekdayIndex(date))
}

export function endOfWeek(date: Date): Date {
  return addDays(date, 6 - weekdayIndex(date))
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** True when the ISO date falls outside [min, max]. ISO strings compare lexicographically. */
export function isOutOfRange(iso: string, min?: string, max?: string): boolean {
  return (Boolean(min) && iso < min!) || (Boolean(max) && iso > max!)
}

/** Clamps an ISO date to [min, max]. */
export function clampISODate(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min
  if (max && iso > max) return max
  return iso
}

/** 6 weeks x 7 days (Monday first) covering the month of `date`. Fixed height avoids layout jumps. */
export function monthGrid(date: Date): Date[][] {
  const first = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)))
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('es') + s.slice(1)

const shortFormat = new Intl.DateTimeFormat('es', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const longFormat = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const monthFormat = new Intl.DateTimeFormat('es', { month: 'long' })
const weekdayLong = new Intl.DateTimeFormat('es', { weekday: 'long' })
const weekdayNarrow = new Intl.DateTimeFormat('es', { weekday: 'narrow' })

/** "mar, 17 nov 2026" */
export const formatShortDate = (date: Date) => shortFormat.format(date)
/** "martes, 17 de noviembre de 2026" */
export const formatLongDate = (date: Date) => longFormat.format(date)
/** "Noviembre 2026" */
export const formatMonthYear = (date: Date) => `${capitalize(monthFormat.format(date))} ${date.getFullYear()}`

/** Weekday headers, Monday first: [{ short: 'L', long: 'lunes' }, ...]. */
export const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const day = new Date(2024, 0, 1 + i) // 1 Jan 2024 was a Monday
  return { short: weekdayNarrow.format(day), long: weekdayLong.format(day) }
})
