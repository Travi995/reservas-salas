import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { ease } from '../../lib/motion'
import { cn } from './cn'
import {
  WEEKDAYS,
  addDays,
  addMonths,
  clampISODate,
  endOfWeek,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  isOutOfRange,
  monthGrid,
  parseISODate,
  startOfWeek,
  toISODate,
  todayISODate,
} from './date-utils'
import { PANEL, TRIGGER, shouldOpenUp, useTriggerRef, useOutsidePointerDown } from './popover'

export interface DatePickerProps {
  label: string
  /** ISO date "YYYY-MM-DD", or '' when empty (same contract as <input type="date">). */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  error?: string
  hint?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  /** Inclusive bounds, "YYYY-MM-DD". Days outside are disabled. */
  min?: string
  max?: string
  /** Forwarded to the trigger button (react-hook-form `field.ref`, so `shouldFocus` works). */
  ref?: Ref<HTMLButtonElement>
}

/** Calendar width in px (18rem); shrinks to fit narrow viewports. */
const PANEL_WIDTH = 288
/** Approximate calendar height, used to decide whether to open upwards. */
const PANEL_HEIGHT = 380
const VIEWPORT_GAP = 8

interface Placement {
  left: number
  width: number
  up: boolean
}

/** Horizontal offset (relative to the trigger) so the calendar never overflows the viewport. */
function computePlacement(trigger: HTMLElement | null): Placement {
  const vw = window.innerWidth
  const width = Math.min(PANEL_WIDTH, vw - VIEWPORT_GAP * 2)
  if (!trigger) return { left: 0, width, up: false }
  const rect = trigger.getBoundingClientRect()
  let left = 0
  if (rect.left + width > vw - VIEWPORT_GAP) left = vw - VIEWPORT_GAP - width - rect.left
  if (rect.left + left < VIEWPORT_GAP) left = VIEWPORT_GAP - rect.left
  return { left, width, up: shouldOpenUp(trigger, PANEL_HEIGHT) }
}

/**
 * Date picker with a Monday-first calendar popover (WAI-ARIA date picker dialog pattern).
 * Value in/out is "YYYY-MM-DD", so it is a drop-in replacement for <input type="date">.
 * The popover renders in place (not portaled), so it works inside an open <dialog>.
 */
export function DatePicker({
  label,
  value,
  onChange,
  onBlur,
  name,
  error,
  hint,
  disabled,
  placeholder = 'Selecciona una fecha',
  className,
  min,
  max,
  ref,
}: DatePickerProps) {
  const id = useId()
  const labelId = `${id}-label`
  const valueId = `${id}-value`
  const panelId = `${id}-panel`
  const headingId = `${id}-heading`
  const msgId = `${id}-msg`

  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLTableElement>(null)
  const [triggerRef, setTriggerRef] = useTriggerRef(ref)
  /** Set when the focused day must receive DOM focus after the next render. */
  const focusDay = useRef(false)

  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(() => todayISODate())
  const [placement, setPlacement] = useState<Placement>({ left: 0, width: PANEL_WIDTH, up: false })

  const today = todayISODate()
  const selectedDate = parseISODate(value)
  const focusedDate = parseISODate(focused) ?? parseISODate(today)!
  const todayDisabled = isOutOfRange(today, min, max)
  const message = error ?? hint
  const invalid = Boolean(error)

  const openCalendar = () => {
    if (disabled) return
    setFocused(selectedDate ? value : clampISODate(today, min, max))
    setPlacement(computePlacement(triggerRef.current))
    focusDay.current = true
    setOpen(true)
  }

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false)
      if (returnFocus) triggerRef.current?.focus()
    },
    [triggerRef],
  )

  const closeFromOutside = useCallback(() => close(false), [close])
  useOutsidePointerDown(open, rootRef, closeFromOutside)

  useEffect(() => {
    if (!open || !focusDay.current) return
    focusDay.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
  }, [open, focused])

  const moveTo = (date: Date) => {
    setFocused(toISODate(date))
    focusDay.current = true
  }

  const choose = (iso: string) => {
    if (isOutOfRange(iso, min, max)) return
    onChange(iso)
    close()
  }

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const d = focusedDate
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(d, -1),
      ArrowRight: () => addDays(d, 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      PageUp: () => addMonths(d, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(d, event.shiftKey ? 12 : 1),
      Home: () => startOfWeek(d),
      End: () => endOfWeek(d),
    }
    // Enter/Space are left to the day button's native click (which calls choose()).
    if (moves[event.key]) {
      event.preventDefault()
      moveTo(moves[event.key]())
    }
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span id={labelId} className="text-sm font-medium text-fg" onClick={() => triggerRef.current?.focus()}>
        {label}
      </span>
      <div
        ref={rootRef}
        className="relative min-w-0"
        onBlur={(e) => {
          if (rootRef.current?.contains(e.relatedTarget)) return
          setOpen(false)
          onBlur?.()
        }}
      >
        <button
          ref={setTriggerRef}
          type="button"
          disabled={disabled}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? msgId : undefined}
          onClick={() => (open ? close() : openCalendar())}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              e.preventDefault()
              openCalendar()
            }
          }}
          className={cn(TRIGGER, invalid ? 'border-danger' : 'border-control')}
        >
          <span id={valueId} className={cn('min-w-0 flex-1 truncate', !selectedDate && 'text-muted-fg')}>
            {selectedDate ? formatShortDate(selectedDate) : placeholder}
          </span>
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-fg" />
        </button>
        {name !== undefined && <input type="hidden" name={name} value={value} />}

        <AnimatePresence>
          {open && (
            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="false"
              aria-label="Elegir fecha"
              initial={{ opacity: 0, y: placement.up ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: placement.up ? 4 : -4, scale: 0.98 }}
              transition={ease}
              style={{ left: placement.left, width: placement.width }}
              // Keeps focus where it is on click (Safari does not focus buttons on click,
              // which would otherwise blur the popover and close it).
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key !== 'Escape') return
                // Keeps a parent <dialog> open: only the calendar closes.
                e.preventDefault()
                e.stopPropagation()
                close()
              }}
              className={cn(PANEL, 'p-3', placement.up ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top')}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => setFocused(toISODate(addMonths(focusedDate, -1)))}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-muted-fg hover:bg-muted hover:text-fg"
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <div id={headingId} aria-live="polite" className="text-sm font-semibold">
                  {formatMonthYear(focusedDate)}
                </div>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => setFocused(toISODate(addMonths(focusedDate, 1)))}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-muted-fg hover:bg-muted hover:text-fg"
                >
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </div>

              <table
                ref={gridRef}
                role="grid"
                aria-labelledby={headingId}
                onKeyDown={onGridKeyDown}
                className="w-full table-fixed border-collapse"
              >
                <thead>
                  <tr>
                    {WEEKDAYS.map((day) => (
                      <th
                        key={day.long}
                        scope="col"
                        abbr={day.long}
                        className="pb-1 text-center text-xs font-medium text-muted-fg"
                      >
                        {day.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthGrid(focusedDate).map((week) => (
                    <tr key={toISODate(week[0])}>
                      {week.map((day) => {
                        const iso = toISODate(day)
                        const isSelected = iso === value
                        const isToday = iso === today
                        const isOutside = day.getMonth() !== focusedDate.getMonth()
                        const isDisabled = isOutOfRange(iso, min, max)
                        return (
                          <td key={iso} aria-selected={isSelected} className="p-0.5 text-center">
                            <button
                              type="button"
                              data-date={iso}
                              tabIndex={iso === focused ? 0 : -1}
                              aria-label={formatLongDate(day)}
                              aria-current={isToday ? 'date' : undefined}
                              aria-disabled={isDisabled || undefined}
                              onClick={() => choose(iso)}
                              className={cn(
                                'mx-auto flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors duration-150',
                                isOutside && !isSelected && 'text-muted-fg',
                                isToday &&
                                  !isSelected &&
                                  'font-semibold text-primary ring-1 ring-primary/50 ring-inset',
                                isSelected && 'bg-primary font-semibold text-primary-fg',
                                isDisabled ? 'cursor-not-allowed opacity-40' : !isSelected && 'hover:bg-muted',
                              )}
                            >
                              {day.getDate()}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-2 flex justify-end border-t border-border pt-2">
                <button
                  type="button"
                  disabled={todayDisabled}
                  onClick={() => choose(today)}
                  className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Hoy
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {message && (
        <p id={msgId} className={cn('text-sm', error ? 'text-danger' : 'text-muted-fg')}>
          {message}
        </p>
      )}
    </div>
  )
}
