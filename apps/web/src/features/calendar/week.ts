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

export interface Placement {
  /** 0-based column inside its group of cards that touch each other. */
  column: number
  /** How many columns that group needs (1 = the card has the full width). */
  columns: number
}

/**
 * Lays out cards that overlap *visually*: a short reservation is drawn taller than its real duration so its
 * text stays readable, so two back-to-back 15-minute ones would cover each other. Cards that touch are put side
 * by side, each group sharing the width equally (the usual calendar layout). `boxes` are in pixels, any order;
 * the result follows the same order.
 */
export function layoutColumns(boxes: { top: number; height: number }[]): Placement[] {
  const result: Placement[] = boxes.map(() => ({ column: 0, columns: 1 }))
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[a].top - boxes[b].top || boxes[a].height - boxes[b].height)

  let group: number[] = []
  let columnEnds: number[] = [] // bottom edge of the last card placed in each column
  let groupEnd = -Infinity

  const closeGroup = () => {
    for (const i of group) result[i].columns = columnEnds.length
    group = []
    columnEnds = []
  }

  for (const i of order) {
    const { top, height } = boxes[i]
    if (top >= groupEnd) closeGroup()
    let column = columnEnds.findIndex((end) => end <= top)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = top + height
    result[i].column = column
    group.push(i)
    groupEnd = Math.max(groupEnd, top + height)
  }
  closeGroup()
  return result
}
