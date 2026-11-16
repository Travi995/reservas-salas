import type { ReservationSlot } from '../../lib/types'
import { hhmm, mondayOf, shiftDays, slotBox, visibleRange } from './week'

const TZ = 'America/Argentina/Buenos_Aires' // UTC-3
const slot = (startsAt: string, endsAt: string): ReservationSlot => ({
  id: startsAt,
  title: 't',
  startsAt,
  endsAt,
  userId: 'u',
  userName: 'Ana',
})

describe('week helpers', () => {
  it('mondayOf: Sunday belongs to the previous week; crosses years', () => {
    expect(mondayOf('2026-11-22')).toBe('2026-11-16')
    expect(mondayOf('2026-11-16')).toBe('2026-11-16')
    expect(mondayOf('2027-01-01')).toBe('2026-12-28')
  })

  it('shiftDays moves whole weeks without time zone drift', () => {
    expect(shiftDays('2026-12-28', 7)).toBe('2027-01-04')
    expect(shiftDays('2026-11-16', -7)).toBe('2026-11-09')
  })

  it('visibleRange is 08–20 by default and widens to whole hours', () => {
    expect(visibleRange([], TZ)).toEqual({ from: 480, to: 1200 })
    // 07:30–08:30 and 21:15–23:59 local
    const slots = [
      slot('2026-11-20T10:30:00Z', '2026-11-20T11:30:00Z'),
      slot('2026-11-21T00:15:00Z', '2026-11-21T02:59:00Z'),
    ]
    expect(visibleRange(slots, TZ)).toEqual({ from: 420, to: 1440 })
  })

  it('slotBox measures from the top of the range in room-local minutes', () => {
    // 10:00–11:30 local, range from 08:00
    expect(slotBox(slot('2026-11-20T13:00:00Z', '2026-11-20T14:30:00Z'), TZ, 480)).toEqual({ top: 120, height: 90 })
  })

  it('hhmm pads hours and minutes', () => {
    expect(hhmm(545)).toBe('09:05')
  })
})
