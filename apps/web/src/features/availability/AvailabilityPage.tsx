import { CalendarX2, ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Button,
  DatePicker,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Pagination,
  Select,
  ViewportPage,
} from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatLongDate, isISODate, nowIn, todayISO } from '../../lib/time'
import type { ReservationSlot, Room } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { CancelReservationDialog } from '../reservations/CancelReservationDialog'
import { ReservationDialog } from '../reservations/ReservationDialog'
import { RoomDayCard } from './RoomDayCard'
import { Stagger, StaggerItem } from '../../components/motion'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, pageFromParams, pageSizeFromParams } from '../reservations/url-state'

const CAPACITY_OPTIONS = [
  { value: '', label: 'Cualquiera' },
  ...[2, 4, 6, 8, 10, 12, 20].map((c) => ({ value: String(c), label: `${c} personas o más` })),
]

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function AvailabilityPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const today = todayISO()
  // A hand-edited or mistyped ?fecha= falls back to today instead of breaking the page.
  const rawDate = params.get('fecha')
  const date = isISODate(rawDate) ? rawDate : today
  const minCapacity = Number(params.get('capacidad')) || 0

  const { data, error, loading, reload } = useAsync(
    () => api.availability(date, minCapacity || undefined),
    [date, minCapacity],
  )

  const [booking, setBooking] = useState<{ roomId: string; date: string } | null>(null)
  const [cancelling, setCancelling] = useState<{ slot: ReservationSlot; room: Room } | null>(null)

  // Changing the date or the capacity goes back to page 1, like the filters of the other listings.
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next, { replace: true })
  }

  const rooms = data?.rooms ?? []

  // The API returns every room of the day, so the browser pages them (as in Salas). Page and size live in the URL.
  const pageSize = pageSizeFromParams(params)
  const totalPages = Math.ceil(rooms.length / pageSize)
  // A page that no longer exists (e.g. after raising the minimum capacity) shows the last one.
  const page = Math.min(pageFromParams(params), Math.max(totalPages, 1))
  const pageRooms = rooms.slice((page - 1) * pageSize, page * pageSize)
  const goToPage = (next: { page?: number; size?: number }) => {
    const q = new URLSearchParams(params)
    const p = next.page ?? 1
    const size = next.size ?? pageSize
    if (p > 1) q.set('page', String(p))
    else q.delete('page')
    if (size !== DEFAULT_PAGE_SIZE) q.set('size', String(size))
    else q.delete('size')
    setParams(q)
  }

  return (
    <ViewportPage>
      <PageHeader compact title="Disponibilidad" description={`Horarios ocupados del ${formatLongDate(date)}.`} />

      <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
        <div className="flex items-end gap-2">
          <Button
            variant="secondary"
            aria-label="Día anterior"
            onClick={() => update('fecha', shiftDate(date, -1))}
            className="px-3"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => update('fecha', today)}
            disabled={date === today}
            className="flex-1 sm:flex-none"
          >
            Hoy
          </Button>
          <Button
            variant="secondary"
            aria-label="Día siguiente"
            onClick={() => update('fecha', shiftDate(date, 1))}
            className="px-3"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
        <DatePicker label="Fecha" value={date} onChange={(value) => update('fecha', value)} />
        <Select
          label="Capacidad mínima"
          value={minCapacity ? String(minCapacity) : ''}
          onChange={(value) => update('capacidad', value)}
          options={CAPACITY_OPTIONS}
        />
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : rooms.length === 0 ? (
        minCapacity ? (
          <EmptyState icon={SearchX} title={`No hay salas para ${minCapacity} personas o más`}>
            Prueba con una capacidad menor.
          </EmptyState>
        ) : (
          <EmptyState icon={CalendarX2} title="No hay salas activas">
            Un administrador debe crear o activar salas.
          </EmptyState>
        )
      ) : (
        <>
          {/* Only this area scrolls; the filters above and the pagination below stay in place. */}
          <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
            <Stagger
              key={`${date}-${minCapacity}-${page}-${pageSize}`}
              className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}
            >
              {pageRooms.map(({ room, reservations }) => (
                <StaggerItem key={room.id}>
                  <RoomDayCard
                    room={room}
                    slots={reservations}
                    user={user!}
                    onReserve={() => {
                      // Never earlier than the room's own today (it can differ from the browser's).
                      const roomToday = nowIn(room.timezone).date
                      setBooking({ roomId: room.id, date: date < roomToday ? roomToday : date })
                    }}
                    onCancel={(slot) => setCancelling({ slot, room })}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div className="shrink-0">
            <Pagination
              meta={{ page, pageSize, totalItems: rooms.length, totalPages }}
              onPageChange={(p) => goToPage({ page: p })}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => goToPage({ size })}
            />
          </div>
        </>
      )}

      <ReservationDialog
        open={booking !== null}
        rooms={rooms.map((r) => r.room)}
        initial={{ roomId: booking?.roomId ?? '', date: booking?.date ?? date }}
        onClose={() => setBooking(null)}
        onCreated={() => {
          setBooking(null)
          reload()
        }}
        onConflict={reload}
      />

      <CancelReservationDialog
        reservation={
          cancelling && {
            ...cancelling.slot,
            room: cancelling.room,
            ownerName: cancelling.slot.userId === user?.id ? undefined : cancelling.slot.userName,
          }
        }
        onClose={() => setCancelling(null)}
        onDone={reload}
      />
    </ViewportPage>
  )
}
