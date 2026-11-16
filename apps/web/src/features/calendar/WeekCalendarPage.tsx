import { CalendarX2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  DatePicker,
  EmptyState,
  PageHeader,
  PageLoader,
  Select,
  cn,
} from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { notify } from '../../lib/notify'
import { formatDate, formatPlainDate, formatTime, isInPast, nowIn, todayISO } from '../../lib/time'
import type { ReservationSlot } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useNow } from '../../lib/useNow'
import { ReservationDialog } from '../reservations/ReservationDialog'
import { hhmm, mondayOf, shiftDays, slotBox, visibleRange } from './week'

/** Pixels per minute: one hour = 48 px. */
const PX = 0.8

export function WeekCalendarPage() {
  const { user } = useAuth()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const today = todayISO()
  const date = params.get('fecha') ?? today
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

  const data = week.data
  const room = data?.room
  const tz = room?.timezone ?? 'UTC'
  const allSlots = data?.days.flatMap((d) => d.reservations) ?? []
  const { from, to } = visibleRange(allSlots, tz)
  const hours: number[] = []
  for (let m = from; m < to; m += 60) hours.push(m)
  const roomNow = nowIn(tz, now)

  const canCancel = (s: ReservationSlot) =>
    (user?.role === 'admin' || s.userId === user?.id) && new Date(s.startsAt) > now

  const weekLabel = `${formatPlainDate(monday, { weekday: undefined })} – ${formatPlainDate(shiftDays(monday, 6), {
    weekday: undefined,
  })}`

  if (rooms.loading && !rooms.data) return <PageLoader />

  return (
    <>
      <PageHeader
        title="Calendario semanal"
        description={room ? `${room.name} · semana del ${weekLabel} · horario de la sala (${tz})` : undefined}
      />

      {rooms.error ? (
        <Alert>{rooms.error.message}</Alert>
      ) : roomList.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No hay salas">
          Un administrador debe crear salas.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
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
            <Alert>
              {week.error.message}{' '}
              <button type="button" onClick={week.reload} className="font-semibold underline">
                Reintentar
              </button>
            </Alert>
          ) : !data ? (
            <PageLoader />
          ) : (
            <Card className={cn('overflow-hidden p-0 transition-opacity', week.loading && 'opacity-60')}>
              {!data.room.isActive && (
                <p className="border-b border-border bg-warning-soft px-4 py-2 text-sm text-warning">
                  Sala desactivada: se muestran sus reservas, pero no acepta nuevas.
                </p>
              )}
              {/* The grid scrolls sideways inside the card on narrow screens; the page itself never does. */}
              <div className="overflow-x-auto">
                <div className="grid min-w-[44rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
                  <div className="sticky left-0 z-20 border-b border-border bg-surface" />
                  {data.days.map((d) => (
                    <div
                      key={d.date}
                      className={cn(
                        'border-b border-l border-border px-2 py-2 text-center text-sm',
                        d.date === roomNow.date && 'bg-primary-soft font-semibold text-primary',
                      )}
                    >
                      <span className="capitalize">{formatPlainDate(d.date, { month: undefined })}</span>
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

                      {d.reservations.map((s) => {
                        const box = slotBox(s, tz, from)
                        const mine = s.userId === user?.id
                        const time = `${formatTime(s.startsAt, tz)}–${formatTime(s.endsAt, tz)}`
                        const cancellable = canCancel(s)
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
                              'absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs',
                              mine ? 'border-primary bg-primary-soft text-fg' : 'border-danger bg-danger-soft text-fg',
                              cancellable ? 'cursor-pointer hover:brightness-95' : 'cursor-default',
                            )}
                            style={{ top: box.top * PX + 1, height: Math.max(box.height * PX - 2, 16) }}
                          >
                            <span className="block truncate font-semibold">{s.title}</span>
                            {box.height >= 30 && (
                              <span className="block truncate text-muted-fg tabular-nums">
                                {time} · {mine ? 'Tú' : s.userName}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </section>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-fg" aria-label="Leyenda">
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
      />

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar reserva"
        confirmLabel="Cancelar reserva"
        onClose={() => setCancelling(null)}
        onConfirm={async () => {
          await api.cancelReservation(cancelling!.id)
          notify.success('Reserva cancelada.')
          week.reload()
        }}
      >
        {cancelling && room && (
          <p>
            «{cancelling.title}» en {room.name}, {formatDate(cancelling.startsAt, tz)} de{' '}
            {formatTime(cancelling.startsAt, tz)} a {formatTime(cancelling.endsAt, tz)}. El horario quedará libre.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
