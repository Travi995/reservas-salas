import { cn } from '../../components/ui'
import { formatTime, minutesOfDay } from '../../lib/time'
import type { ReservationSlot } from '../../lib/types'

const DEFAULT_START = 8 * 60
const DEFAULT_END = 20 * 60

/**
 * Visual strip of the day (08:00–20:00, widened if there are bookings outside it).
 * It is decorative: the time slot list below is the accessible source.
 */
export function DayTimeline({ slots, timeZone }: { slots: ReservationSlot[]; timeZone: string }) {
  const ranges = slots.map((s) => {
    const start = minutesOfDay(s.startsAt, timeZone)
    const end = minutesOfDay(s.endsAt, timeZone) || 24 * 60 // end at midnight
    return { id: s.id, start, end, label: `${formatTime(s.startsAt, timeZone)}–${formatTime(s.endsAt, timeZone)}` }
  })
  const from = Math.floor(Math.min(DEFAULT_START, ...ranges.map((r) => r.start)) / 60) * 60
  const to = Math.ceil(Math.max(DEFAULT_END, ...ranges.map((r) => r.end)) / 60) * 60
  const total = to - from
  const pct = (m: number) => `${((m - from) / total) * 100}%`

  const hours: number[] = []
  for (let h = from; h <= to; h += 60) hours.push(h)

  return (
    <div aria-hidden="true" className="select-none">
      <div className="relative h-8 overflow-hidden rounded-md bg-success-soft">
        {hours.slice(1, -1).map((h) => (
          <span key={h} className="absolute inset-y-0 w-px bg-fg/10" style={{ left: pct(h) }} />
        ))}
        {ranges.map((r) => (
          <span
            key={r.id}
            title={r.label}
            className="absolute inset-y-1 rounded-sm bg-danger"
            style={{ left: pct(r.start), width: `calc(${pct(r.end)} - ${pct(r.start)})` }}
          />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-muted-fg tabular-nums">
        {hours.map((h, i) => (
          <span
            key={h}
            className={cn(
              'absolute -translate-x-1/2',
              i === 0 && 'translate-x-0',
              i === hours.length - 1 && '-translate-x-full',
              // On narrow screens, only one label every three hours.
              i % 3 !== 0 && 'hidden md:inline',
            )}
            style={{ left: pct(h) }}
          >
            {String(h / 60).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  )
}
