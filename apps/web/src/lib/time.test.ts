import { formatPlainDate, validateSlot, weeklyDates, zoneLabel } from './time'

const TZ = 'America/Argentina/Buenos_Aires' // UTC-3, no daylight saving time
// "Now" = 2026-11-20 09:30 in Buenos Aires.
const NOW = new Date('2026-11-20T12:30:00Z')
const slot = (startTime: string, endTime: string, date = '2026-11-21') => ({ date, startTime, endTime })

describe('validateSlot (section 4 rules in the frontend)', () => {
  it('accepts a valid time slot', () => {
    expect(validateSlot(slot('10:00', '11:00'), TZ, NOW)).toBeNull()
  })

  it('requires the end to be after the start', () => {
    expect(validateSlot(slot('11:00', '11:00'), TZ, NOW)).toMatch(/posterior/)
    expect(validateSlot(slot('11:00', '10:00'), TZ, NOW)).toMatch(/posterior/)
  })

  it('rejects the past, including starting right now', () => {
    expect(validateSlot(slot('10:00', '11:00', '2026-11-19'), TZ, NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('09:00', '10:00', '2026-11-20'), TZ, NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('09:30', '10:00', '2026-11-20'), TZ, NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('09:45', '10:00', '2026-11-20'), TZ, NOW)).toBeNull()
  })

  it("uses the room's time, not the browser's", () => {
    // 09:30 in Buenos Aires is 21:30 in Tokyo: the same day is almost over there.
    expect(validateSlot(slot('20:00', '21:00', '2026-11-20'), 'Asia/Tokyo', NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('20:00', '21:00', '2026-11-20'), TZ, NOW)).toBeNull()
  })

  it('duration: 15 min and 4 h are valid; 14 min and 4 h 1 min are not', () => {
    expect(validateSlot(slot('10:00', '10:15'), TZ, NOW)).toBeNull()
    expect(validateSlot(slot('10:00', '14:00'), TZ, NOW)).toBeNull()
    expect(validateSlot(slot('10:00', '10:14'), TZ, NOW)).toMatch(/al menos 15/)
    expect(validateSlot(slot('10:00', '14:01'), TZ, NOW)).toMatch(/más de 4 horas/)
  })

  it('requires empty fields', () => {
    expect(validateSlot(slot('', '11:00'), TZ, NOW)).toMatch(/Indica/)
  })
})

describe('weeklyDates', () => {
  it('repeats the same weekday every week, across months and years', () => {
    expect(weeklyDates('2026-12-21', 3)).toEqual(['2026-12-21', '2026-12-28', '2027-01-04'])
  })
})

describe('formatPlainDate', () => {
  it('formats a plain date without shifting it by the browser time zone', () => {
    expect(formatPlainDate('2026-11-23')).toBe('lun, 23 nov')
  })
})

describe('zoneLabel', () => {
  it('names the room zone only when it differs from the viewer', () => {
    expect(zoneLabel('America/Argentina/Buenos_Aires', 'Europe/Madrid')).toBe('hora de Buenos Aires')
    expect(zoneLabel('Europe/Madrid', 'Europe/Madrid')).toBeNull()
  })
})
