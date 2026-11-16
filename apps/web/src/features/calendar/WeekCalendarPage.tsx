import { CalendarX2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Button,
  Card,
  DatePicker,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Select,
  ViewportPage,
  cn,
} from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatPlainDate, formatTime, isInPast, isISODate, nowIn, todayISO, zoneCity } from '../../lib/time'
import type { ReservationSlot } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useNow } from '../../lib/useNow'
import { CancelReservationDialog } from '../reservations/CancelReservationDialog'
import { ReservationDialog } from '../reservations/ReservationDialog'
import { hhmm, layoutColumns, mondayOf, shiftDays, slotBox, visibleRange } from './week'

/**
 * Pixels per minute. The grid adapts to the height available (so the page needs no scroll), within these bounds.
 * The minimum keeps a one-hour card tall enough (45 px) for its title and time on two lines; below that the
 * calendar scrolls inside its card instead of squeezing the cards.
 */
const PX_MIN = 0.75
const PX_MAX = 1
/** Cards at least this tall (px) show the title and the time on separate lines; shorter ones fit both on one. */
const CARD_TWO_LINES_PX = 38
/** A card is never drawn shorter than this (px): a 15-minute meeting would otherwise be too small to read. */
const MIN_CARD_PX = 20
/** Height of the sticky row with the day names, which is not part of the hours area. */
const HEADER_PX = 40

export function WeekCalendarPage() {
  const { user } = useAuth()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const today = todayISO()
  // A hand-edited or mistyped ?fecha= falls back to today instead of breaking the page.
  const rawDate = params.get('fecha')
  const date = isISODate(rawDate) ? rawDate : today
  const monday = mondayOf(date)

  // Admins can also browse inactive rooms (their past reservations stay visible).
  const rooms = useAsync(() => api.rooms(user?.role === 'admin'), [user?.role])
  const roomList = rooms.data ?? []
  const roomId = params.get('sala') ?? roomList.find((r) => r.isActive)?.id ?? roomList[0]?.id ?? ''

  const week = useAsync(() => (roomId ? api.week(roomId, monday) : Promise.resolve(null)), [roomId, monday])

  const [booking, setBooking] = useState<{ date: string; startTime: string; endTime: string } | null>(null)
  const [cancelling, setCancelling] = useState<ReservationSlot | null>(null)

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  // The calendar fills the space the page leaves; its hours are scaled to fit, and only if they cannot
  // (very short window) the card scrolls inside itself, with the day names pinned.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const [areaHeight, setAreaHeight] = useState(0)
  useEffect(() => {
    if (!scroller) return
    const measure = () => setAreaHeight(scroller.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [scroller])

  const data = week.data
  const room = data?.room
  const tz = room?.timezone ?? 'UTC'
  const allSlots = data?.days.flatMap((d) => d.reservations) ?? []
  const { from, to } = visibleRange(allSlots, tz)
  const hours: number[] = []
  for (let m = from; m < to; m += 60) hours.push(m)
  const roomNow = nowIn(tz, now)
  const PX = areaHeight > 0 ? Math.min(PX_MAX, Math.max(PX_MIN, (areaHeight - HEADER_PX) / (to - from))) : PX_MAX

  const canCancel = (s: ReservationSlot) =>
    (user?.role === 'admin' || s.userId === user?.id) && new Date(s.startsAt) > now

  const weekLabel = `${formatPlainDate(monday, { weekday: undefined })} – ${formatPlainDate(shiftDays(monday, 6), {
    weekday: undefined,
  })}`

  if (rooms.loading && !rooms.data) return <PageLoader />

  return (
    <ViewportPage>
      <PageHeader
        compact
        title="Calendario semanal"
        actions={
          room && (
            <p className="text-sm text-muted-fg">
              {room.name} · {weekLabel} · hora de {zoneCity(tz)}
            </p>
          )
        }
      />

      {rooms.error ? (
        <ErrorState message={rooms.error.message} onRetry={rooms.reload} />
      ) : roomList.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No hay salas">
          Un administrador debe crear salas.
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                aria-label="Semana anterior"
                onClick={() => update({ fecha: shiftDays(monday, -7) })}
                className="px-3"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => update({ fecha: '' })}
                disabled={monday === mondayOf(today)}
                className="flex-1 sm:flex-none"
              >
                Esta semana
              </Button>
              <Button
                variant="secondary"
                aria-label="Semana siguiente"
                onClick={() => update({ fecha: shiftDays(monday, 7) })}
                className="px-3"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </Button>
            </div>
            <Select
              label="Sala"
              value={roomId}
              onChange={(value) => update({ sala: value })}
              options={roomList.map((r) => ({
                value: r.id,
                label: r.isActive ? r.name : `${r.name} (desactivada)`,
                description: `${r.capacity} personas · ${r.location}`,
              }))}
            />
            <DatePicker label="Ir a la semana de" value={date} onChange={(value) => update({ fecha: value })} />
          </div>

          {week.error ? (
            <ErrorState message={week.error.message} onRetry={week.reload} />
          ) : !data ? (
            <PageLoader />
          ) : (
            <Card
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden p-0 transition-opacity',
                week.loading && 'opacity-60',
              )}
            >
              {!data.room.isActive && (
                <p className="border-b border-border bg-warning-soft px-4 py-2 text-sm text-warning">
                  Sala desactivada: se muestran sus reservas, pero no acepta nuevas.
                </p>
              )}
              {/* Scrolls inside the card (sideways on narrow screens, vertically if the hours do not fit); the page itself never does. */}
              <div ref={setScroller} className="min-h-0 flex-1 overflow-auto">
                <div className="grid min-w-[44rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
                  <div className="sticky top-0 left-0 z-30 border-b border-border bg-surface" />
                  {data.days.map((d) => (
                    <div
                      key={d.date}
                      className={cn(
                        'sticky top-0 z-20 flex items-center justify-center border-b border-l border-border bg-surface text-center text-sm',
                        d.date === roomNow.date && 'bg-primary-soft font-semibold text-primary',
                      )}
                    >
                      <span
                        className="inline-block first-letter:uppercase"
                        style={{ height: HEADER_PX - 1, lineHeight: `${HEADER_PX - 1}px` }}
                      >
                        {formatPlainDate(d.date, { month: undefined })}
                      </span>
                    </div>
                  ))}

                  {/* Hour labels */}
                  <div className="sticky left-0 z-20 bg-surface" style={{ height: (to - from) * PX }}>
                    {hours.map((m) => (
                      <span
                        key={m}
                        className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-fg tabular-nums first:translate-y-0"
                        style={{ top: (m - from) * PX }}
                      >
                        {hhmm(m)}
                      </span>
                    ))}
                  </div>

                  {data.days.map((d) => (
                    <section
                      key={d.date}
                      aria-label={formatPlainDate(d.date, { weekday: 'long', month: 'long' })}
                      className="relative border-l border-border"
                      style={{ height: (to - from) * PX }}
                    >
                      {/* One button per hour to book it: keyboard reachable, disabled in the past. */}
                      {hours.map((m) => {
                        const start = hhmm(m)
                        const past = isInPast(d.date, start, tz, now)
                        const bookable = data.room.isActive && !past
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={!bookable}
                            onClick={() =>
                              setBooking({
                                date: d.date,
                                startTime: start,
                                endTime: hhmm(Math.min(m + 60, 23 * 60 + 45)),
                              })
                            }
                            aria-label={`Reservar ${formatPlainDate(d.date, { weekday: 'long', month: 'long' })} a las ${start}`}
                            className={cn(
                              'group absolute inset-x-0 flex items-start justify-end border-t border-border/70 p-1',
                              past ? 'bg-muted/50' : 'hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60',
                              !bookable && 'cursor-default',
                            )}
                            style={{ top: (m - from) * PX, height: 60 * PX }}
                          >
                            {bookable && (
                              <Plus
                                aria-hidden="true"
                                className="size-4 text-primary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                              />
                            )}
                          </button>
                        )
                      })}

                      {d.date === roomNow.date && roomNow.minutes >= from && roomNow.minutes < to && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-danger"
                          style={{ top: (roomNow.minutes - from) * PX }}
                        />
                      )}

                      {(() => {
                        // Cards drawn taller than their duration can touch: those share the day's width side by side.
                        const boxes = d.reservations.map((s) => {
                          const b = slotBox(s, tz, from)
                          return { top: b.top * PX + 1, height: Math.max(b.height * PX - 2, MIN_CARD_PX) }
                        })
                        const placements = layoutColumns(boxes)
                        return d.reservations.map((s, index) => {
                          const mine = s.userId === user?.id
                          const time = `${formatTime(s.startsAt, tz)}–${formatTime(s.endsAt, tz)}`
                          const cancellable = canCancel(s)
                          const owner = mine ? 'Tú' : s.userName
                          // The pixel height of the card decides its layout: two lines need ~38 px, otherwise one (short meetings).
                          const { top, height } = boxes[index]
                          const { column, columns } = placements[index]
                          const twoLines = height >= CARD_TWO_LINES_PX
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={!cancellable}
                              onClick={() => setCancelling(s)}
                              title={`${s.title} · ${time} · ${mine ? 'Tú' : s.userName}`}
                              aria-label={`${s.title}, ${time}, ${mine ? 'tu reserva' : `de ${s.userName}`}${
                                cancellable ? '. Pulsa para cancelar' : ''
                              }`}
                              className={cn(
                                'absolute z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs leading-4',
                                mine
                                  ? 'border-primary bg-primary-soft text-fg'
                                  : 'border-danger bg-danger-soft text-fg',
                                cancellable ? 'cursor-pointer hover:brightness-95' : 'cursor-default',
                              )}
                              style={{
                                top,
                                height,
                                // The day's width (minus 4 px of margin on each side) is shared by the cards that touch.
                                left: `calc(0.25rem + (100% - 0.5rem) * ${column} / ${columns})`,
                                width: `calc((100% - 0.5rem) / ${columns} - ${columns > 1 ? 2 : 0}px)`,
                              }}
                            >
                              {columns > 1 ? (
                                // Side by side the card is too narrow for a title: the start time stays readable and the
                                // full title is in the tooltip and the accessible name.
                                <span className="block truncate font-semibold tabular-nums">
                                  {formatTime(s.startsAt, tz)}
                                </span>
                              ) : twoLines ? (
                                <>
                                  <span className="block truncate font-semibold">{s.title}</span>
                                  {/* The time never truncates; the name gives way when the column is narrow. */}
                                  <span className="flex gap-1 tabular-nums">
                                    <span className="shrink-0 font-medium">{time}</span>
                                    <span className="truncate opacity-75">· {owner}</span>
                                  </span>
                                </>
                              ) : (
                                <span className="flex gap-1 tabular-nums">
                                  <span className="shrink-0 font-semibold">{formatTime(s.startsAt, tz)}</span>
                                  <span className="truncate font-semibold">{s.title}</span>
                                </span>
                              )}
                            </button>
                          )
                        })
                      })()}
                    </section>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <ul className="mt-2 flex shrink-0 flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-fg" aria-label="Leyenda">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-sm border-l-4 border-primary bg-primary-soft" /> Tus
              reservas
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-sm border-l-4 border-danger bg-danger-soft" /> Ocupado
            </li>
            <li>Pulsa un hueco libre para reservar; pulsa una reserva tuya para cancelarla.</li>
          </ul>
        </>
      )}

      <ReservationDialog
        open={booking !== null}
        rooms={roomList.filter((r) => r.isActive)}
        initial={{ roomId, date: booking?.date ?? today, startTime: booking?.startTime, endTime: booking?.endTime }}
        onClose={() => setBooking(null)}
        onCreated={() => {
          setBooking(null)
          week.reload()
        }}
        onConflict={week.reload}
      />

      <CancelReservationDialog
        reservation={
          cancelling && room
            ? { ...cancelling, room, ownerName: cancelling.userId === user?.id ? undefined : cancelling.userName }
            : null
        }
        onClose={() => setCancelling(null)}
        onDone={week.reload}
      />
    </ViewportPage>
  )
}
