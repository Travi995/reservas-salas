import { cn } from './cn'

/** The three time slots of the brand mark (x, y, width): same geometry as LogoMark and public/favicon.svg. */
const SLOTS = [
  { y: 8, width: 18 },
  { y: 14.25, width: 18 },
  { y: 20.5, width: 11 },
]

/**
 * Loading animation drawn with the brand mark: the three slots get «booked» one after another
 * (they fill from left to right in a wave) and the cycle starts over. Pure CSS (see `.slot-bar` in index.css),
 * so it costs nothing to render and stands still with `prefers-reduced-motion`.
 */
export function SlotsLoader({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-12 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      {SLOTS.map(({ y, width }, i) => (
        <g key={y}>
          {/* Empty slot */}
          <rect x="7" y={y} width={width} height="3.5" rx="1.75" className="fill-primary-fg" fillOpacity=".28" />
          {/* Booking it */}
          <rect
            x="7"
            y={y}
            width={width}
            height="3.5"
            rx="1.75"
            className="slot-bar fill-primary-fg"
            style={{ animationDelay: `${i * 0.22}s` }}
          />
        </g>
      ))}
    </svg>
  )
}
