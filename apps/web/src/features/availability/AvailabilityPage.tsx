import { CalendarX2, ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  DatePicker,
  PageHeader,
  PageLoader,
  Select,
} from '../../components/ui'
import { api } from '../../lib/api'
import { notify } from '../../lib/notify'
import { useAuth } from '../../lib/auth'
import { formatLongDate, formatTime, todayISO } from '../../lib/time'
import type { ReservationSlot, Room } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { ReservationDialog } from '../reservations/ReservationDialog'
import { RoomDayCard } from './RoomDayCard'
import { Stagger, StaggerItem } from '../../components/motion'

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
  const date = params.get('fecha') ?? today
  const minCapacity = Number(params.get('capacidad')) || 0

  const { data, error, loading, reload } = useAsync(
    () => api.availability(date, minCapacity || undefined),
    [date, minCapacity],
  )

  const [booking, setBooking] = useState<{ roomId: string } | null>(null)
  const [cancelling, setCancelling] = useState<{ slot: ReservationSlot; room: Room } | null>(null)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const rooms = data?.rooms ?? []

  return (
    <>
      <PageHeader title="Disponibilidad" description={`Horarios ocupados del ${formatLongDate(date)}.`} />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
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
        <Alert>
          {error.message}{' '}
          <button type="button" onClick={reload} className="font-semibold underline">
            Reintentar
          </button>
        </Alert>
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
        <Stagger
          key={`${date}-${minCapacity}`}
          className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}
        >
          {rooms.map(({ room, reservations }) => (
            <StaggerItem key={room.id}>
              <RoomDayCard
                room={room}
                slots={reservations}
                user={user!}
                onReserve={() => setBooking({ roomId: room.id })}
                onCancel={(slot) => setCancelling({ slot, room })}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <ReservationDialog
        open={booking !== null}
        rooms={rooms.map((r) => r.room)}
        initial={{ roomId: booking?.roomId ?? '', date: date < today ? today : date }}
        onClose={() => setBooking(null)}
        onCreated={() => {
          setBooking(null)
          reload()
        }}
      />

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar reserva"
        confirmLabel="Cancelar reserva"
        onClose={() => setCancelling(null)}
        onConfirm={async () => {
          await api.cancelReservation(cancelling!.slot.id)
          notify.success('Reserva cancelada.')
          reload()
        }}
      >
        {cancelling && (
          <p>
            «{cancelling.slot.title}» en {cancelling.room.name}, de{' '}
            {formatTime(cancelling.slot.startsAt, cancelling.room.timezone)} a{' '}
            {formatTime(cancelling.slot.endsAt, cancelling.room.timezone)}. El horario quedará libre.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
