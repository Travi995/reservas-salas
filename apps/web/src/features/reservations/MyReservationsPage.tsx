import { CalendarCheck, History } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Pagination,
  cn,
} from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate, formatTime, zoneLabel } from '../../lib/time'
import type { Reservation, ReservationScope } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useNow } from '../../lib/useNow'
import { motion } from 'motion/react'
import { Stagger, StaggerItem } from '../../components/motion'
import { spring } from '../../lib/motion'
import { CancelReservationDialog } from './CancelReservationDialog'
import { pageFromParams } from './url-state'

type Tab = ReservationScope

const PAGE_SIZE = 10
const TABS: { id: Tab; label: string }[] = [
  { id: 'upcoming', label: 'Próximas' },
  { id: 'past', label: 'Pasadas' },
]

export function MyReservationsPage() {
  // Tab and page live in the URL (?tab=past&page=2): reload, back/forward and shared links keep them.
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'past' ? 'past' : 'upcoming'
  const page = pageFromParams(params)
  const go = (next: { tab?: Tab; page?: number }) => {
    const t = next.tab ?? tab
    const p = next.page ?? 1
    const q = new URLSearchParams()
    if (t !== 'upcoming') q.set('tab', t)
    if (p > 1) q.set('page', String(p))
    setParams(q)
  }

  // The server filters, orders and paginates; we only ask for the current tab's page.
  const { data, error, loading, reload } = useAsync(
    () => api.myReservations(tab, { page, pageSize: PAGE_SIZE }).then((res) => ({ tab, res })),
    [tab, page],
  )
  const [cancelling, setCancelling] = useState<Reservation | null>(null)
  // Changing page keeps the current rows (dimmed) until the next ones arrive; changing tab does not:
  // the previous tab's rows and counter must never pass for this one's.
  const fresh = data?.tab === tab ? data.res : null
  const items = fresh?.items ?? []
  const outOfRange = fresh !== null && fresh.meta.totalPages > 0 && page > fresh.meta.totalPages

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
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="tab-panel"
            onClick={() => go({ tab: t.id })}
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
            {t.label}{' '}
            {tab === t.id && fresh && <span className="text-muted-fg tabular-nums">({fresh.meta.totalItems})</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`}>
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : !fresh ? (
          <PageLoader />
        ) : outOfRange ? (
          <EmptyState icon={History} title="Esta página ya no existe">
            <Button variant="secondary" size="sm" onClick={() => go({ page: fresh.meta.totalPages })}>
              Ir a la última página
            </Button>
          </EmptyState>
        ) : items.length === 0 ? (
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
          <>
            <Stagger
              as="ul"
              key={`${tab}-${fresh.meta.page}`}
              aria-busy={loading}
              className={cn('flex flex-col gap-3 transition-opacity', loading && 'opacity-60')}
            >
              {items.map((r) => (
                <StaggerItem as="li" key={r.id}>
                  <ReservationRow reservation={r} onCancel={() => setCancelling(r)} />
                </StaggerItem>
              ))}
            </Stagger>
            <Pagination meta={fresh.meta} onPageChange={(p) => go({ page: p })} disabled={loading} />
          </>
        )}
      </div>

      {/* A cancelled upcoming reservation stays in «Próximas» (marked as cancelled), so the page keeps its rows. */}
      <CancelReservationDialog reservation={cancelling} onClose={() => setCancelling(null)} onDone={reload} />
    </>
  )
}

/** One reservation as a card. `details` adds extra lines (the admin listing shows who booked it). */
export function ReservationRow({
  reservation: r,
  onCancel,
  details,
}: {
  reservation: Reservation
  onCancel: () => void
  details?: ReactNode
}) {
  const tz = r.room.timezone
  const now = useNow()
  const cancelled = r.status === 'cancelled'
  const started = new Date(r.startsAt) <= now
  const ongoing = !cancelled && started && new Date(r.endsAt) > now
  // Times are shown in the room's zone; say so when it is not the viewer's.
  const zone = zoneLabel(tz)

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-baseline gap-2 sm:w-40 sm:flex-col sm:gap-0">
        <p className="font-semibold capitalize">{formatDate(r.startsAt, tz)}</p>
        <p className="text-sm text-muted-fg tabular-nums">
          {formatTime(r.startsAt, tz)}–{formatTime(r.endsAt, tz)}
          {zone && <span className="block text-xs">({zone})</span>}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', cancelled && 'text-muted-fg line-through')}>{r.title}</p>
        <p className="truncate text-sm text-muted-fg">
          {r.room.name} · {r.room.location}
        </p>
        {details}
      </div>
      <div className="flex items-center gap-2">
        {cancelled && <Badge>Cancelada</Badge>}
        {ongoing && <Badge tone="info">En curso</Badge>}
        {r.seriesId && <Badge tone="primary">Semanal</Badge>}
        {!r.room.isActive && <Badge tone="warning">Sala desactivada</Badge>}
        {!cancelled && !started && (
          <Button
            variant="danger"
            size="sm"
            onClick={onCancel}
            className="ml-auto sm:ml-0"
            aria-label={`Cancelar la reserva «${r.title}» del ${formatDate(r.startsAt, tz)} a las ${formatTime(r.startsAt, tz)}`}
          >
            Cancelar reserva
          </Button>
        )}
      </div>
    </Card>
  )
}
