import { CalendarCheck, History } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, PageLoader, cn } from '../../components/ui'
import { api } from '../../lib/api'
import { notify } from '../../lib/notify'
import { formatDate, formatTime } from '../../lib/time'
import type { Reservation } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useNow } from '../../lib/useNow'
import { motion } from 'motion/react'
import { Stagger, StaggerItem } from '../../components/motion'
import { spring } from '../../lib/motion'

type Tab = 'upcoming' | 'past'

export function MyReservationsPage() {
  const { data, error, loading, reload } = useAsync(() => api.myReservations(), [])
  const [tab, setTab] = useState<Tab>('upcoming')
  const [cancelling, setCancelling] = useState<Reservation | null>(null)

  const tabs: { id: Tab; label: string; items: Reservation[] }[] = [
    { id: 'upcoming', label: 'Próximas', items: data?.upcoming ?? [] },
    { id: 'past', label: 'Pasadas', items: data?.past ?? [] },
  ]
  const current = tabs.find((t) => t.id === tab)!

  return (
    <>
      <PageHeader
        title="Mis reservas"
        actions={
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Nueva reserva
          </Link>
        }
      />

      <div
        role="tablist"
        aria-label="Reservas"
        className="relative isolate mb-4 inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="tab-panel"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative h-10 flex-1 rounded-md px-4 text-sm font-semibold transition-colors duration-150 sm:flex-none',
              tab === t.id ? 'text-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="reservations-tab"
                transition={spring}
                className="absolute inset-0 -z-10 rounded-md bg-surface shadow-sm"
              />
            )}
            {t.label} {data && <span className="text-muted-fg tabular-nums">({t.items.length})</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`}>
        {loading && !data ? (
          <PageLoader />
        ) : error ? (
          <Alert>{error.message}</Alert>
        ) : current.items.length === 0 ? (
          tab === 'upcoming' ? (
            <EmptyState icon={CalendarCheck} title="No tienes reservas próximas">
              Busca un hueco en{' '}
              <Link to="/" className="font-semibold text-primary hover:underline">
                Disponibilidad
              </Link>
              .
            </EmptyState>
          ) : (
            <EmptyState icon={History} title="Aún no tienes reservas pasadas" />
          )
        ) : (
          <Stagger as="ul" key={tab} className="flex flex-col gap-3">
            {current.items.map((r) => (
              <StaggerItem as="li" key={r.id}>
                <ReservationRow reservation={r} onCancel={() => setCancelling(r)} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar reserva"
        confirmLabel="Cancelar reserva"
        onClose={() => setCancelling(null)}
        onConfirm={async () => {
          await api.cancelReservation(cancelling!.id)
          notify.success('Reserva cancelada.')
          reload()
        }}
      >
        {cancelling && (
          <p>
            «{cancelling.title}» en {cancelling.room.name}, {formatDate(cancelling.startsAt, cancelling.room.timezone)}{' '}
            de {formatTime(cancelling.startsAt, cancelling.room.timezone)} a{' '}
            {formatTime(cancelling.endsAt, cancelling.room.timezone)}.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}

function ReservationRow({ reservation: r, onCancel }: { reservation: Reservation; onCancel: () => void }) {
  const tz = r.room.timezone
  const now = useNow()
  const cancelled = r.status === 'cancelled'
  const started = new Date(r.startsAt) <= now
  const ongoing = !cancelled && started && new Date(r.endsAt) > now

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-baseline gap-2 sm:w-40 sm:flex-col sm:gap-0">
        <p className="font-semibold capitalize">{formatDate(r.startsAt, tz)}</p>
        <p className="text-sm text-muted-fg tabular-nums">
          {formatTime(r.startsAt, tz)}–{formatTime(r.endsAt, tz)}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', cancelled && 'text-muted-fg line-through')}>{r.title}</p>
        <p className="truncate text-sm text-muted-fg">
          {r.room.name} · {r.room.location}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {cancelled && <Badge>Cancelada</Badge>}
        {ongoing && <Badge tone="info">En curso</Badge>}
        {!r.room.isActive && <Badge tone="warning">Sala desactivada</Badge>}
        {!cancelled && !started && (
          <Button variant="danger" size="sm" onClick={onCancel} className="ml-auto sm:ml-0">
            Cancelar
          </Button>
        )}
      </div>
    </Card>
  )
}
