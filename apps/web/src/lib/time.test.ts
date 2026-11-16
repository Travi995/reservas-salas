import { validateSlot } from './time'

const TZ = 'America/Argentina/Buenos_Aires' // UTC-3, sin horario de verano
// "Ahora" = 2026-11-20 09:30 en Buenos Aires.
const NOW = new Date('2026-11-20T12:30:00Z')
const slot = (startTime: string, endTime: string, date = '2026-11-21') => ({ date, startTime, endTime })

describe('validateSlot (reglas de la sección 4 en el front)', () => {
  it('acepta un horario válido', () => {
    expect(validateSlot(slot('10:00', '11:00'), TZ, NOW)).toBeNull()
  })

  it('exige que el fin sea posterior al inicio', () => {
    expect(validateSlot(slot('11:00', '11:00'), TZ, NOW)).toMatch(/posterior/)
    expect(validateSlot(slot('11:00', '10:00'), TZ, NOW)).toMatch(/posterior/)
  })

  it('rechaza el pasado, incluido empezar justo ahora', () => {
    expect(validateSlot(slot('10:00', '11:00', '2026-11-19'), TZ, NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('09:00', '10:00', '2026-11-20'), TZ, NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('09:30', '10:00', '2026-11-20'), TZ, NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('09:45', '10:00', '2026-11-20'), TZ, NOW)).toBeNull()
  })

  it('usa la hora de la sala, no la del navegador', () => {
    // 09:30 en Buenos Aires es 21:30 en Tokio: el mismo día ya está casi acabado allí.
    expect(validateSlot(slot('20:00', '21:00', '2026-11-20'), 'Asia/Tokyo', NOW)).toMatch(/pasado/)
    expect(validateSlot(slot('20:00', '21:00', '2026-11-20'), TZ, NOW)).toBeNull()
  })

  it('duración: 15 min y 4 h valen; 14 min y 4 h 1 min no', () => {
    expect(validateSlot(slot('10:00', '10:15'), TZ, NOW)).toBeNull()
    expect(validateSlot(slot('10:00', '14:00'), TZ, NOW)).toBeNull()
    expect(validateSlot(slot('10:00', '10:14'), TZ, NOW)).toMatch(/al menos 15/)
    expect(validateSlot(slot('10:00', '14:01'), TZ, NOW)).toMatch(/más de 4 horas/)
  })

  it('pide los campos vacíos', () => {
    expect(validateSlot(slot('', '11:00'), TZ, NOW)).toMatch(/Indica/)
  })
})
