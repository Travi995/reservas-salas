import { CalendarCheck, History } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Pagination,
  ViewToggle,
  ViewportPage,
  cn,
} from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDate, formatTime, zoneLabel } from '../../lib/time'
import type { Reservation, ReservationScope, ReservationSortField } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useNow } from '../../lib/useNow'
import { useViewMode } from '../../lib/useViewMode'
import { motion } from 'motion/react'
import { Stagger, StaggerItem } from '../../components/motion'
import { spring } from '../../lib/motion'
import { CancelReservationDialog } from './CancelReservationDialog'
import { ReservationBadges } from './ReservationBadges'
import { ReservationsTable } from './ReservationsTable'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  RESERVATION_SORT_FIELDS,
  pageFromParams,
  pageSizeFromParams,
} from './url-state'
import { nextSort, sortFromParams, writeSortParams, type SortState } from '../../lib/sort'

type Tab = ReservationScope

const TABS: { id: Tab; label: string }[] = [
  { id: 'upcoming', label: 'Próximas' },
  { id: 'past', label: 'Pasadas' },
]

export function MyReservationsPage() {
  // Tab and page live in the URL (?tab=past&page=2): reload, back/forward and shared links keep them.
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'past' ? 'past' : 'upcoming'
  const page = pageFromParams(params)
  const pageSize = pageSizeFromParams(params)
  const sort = sortFromParams(params, RESERVATION_SORT_FIELDS)
  // Changing tab or page size goes back to page 1; the chosen size is kept across tabs.
  const go = (next: { tab?: Tab; page?: number; size?: number; sort?: SortState<ReservationSortField> | null }) => {
    const t = next.tab ?? tab
    const p = next.page ?? 1
    const size = next.size ?? pageSize
    const q = new URLSearchParams()
    if (t !== 'upcoming') q.set('tab', t)
    if (p > 1) q.set('page', String(p))
    if (size !== DEFAULT_PAGE_SIZE) q.set('size', String(size))
    // The chosen order survives tab and page changes; `null` clears it.
    writeSortParams(q, next.sort === undefined ? sort : next.sort)
    setParams(q)
  }

  // The server filters, orders and paginates; we only ask for the current tab's page.
  const { data, error, loading, reload } = useAsync(
    () =>
      api.myReservations(tab, { page, pageSize, sortBy: sort?.by, sortDir: sort?.dir }).then((res) => ({ tab, res })),
    [tab, page, pageSize, sort?.by, sort?.dir],
  )
  const [cancelling, setCancelling] = useState<Reservation | null>(null)
  const [view, setView] = useViewMode()
  // Changing page keeps the current rows (dimmed) until the next ones arrive; changing tab does not:
  // the previous tab's rows and counter must never pass for this one's.
  const fresh = data?.tab === tab ? data.res : null
  const items = fresh?.items ?? []
  const outOfRange = fresh !== null && fresh.meta.totalPages > 0 && page > fresh.meta.totalPages

  return (
    <ViewportPage>
      <PageHeader
        compact
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

      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Reservas"
          className="relative isolate inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto"
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
              {/* Cancelled ones stay listed (marked), but are not «próximas»: the counter leaves them out. */}
              {tab === t.id && fresh && (
                <span className="text-muted-fg tabular-nums">
                  ({t.id === 'upcoming' ? fresh.meta.activeItems : fresh.meta.totalItems})
                </span>
              )}
            </button>
          ))}
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
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
            {/* Only this area scrolls; tabs above and pagination below stay in place. */}
            <div className={cn('min-h-0 flex-1', view === 'cards' && '-mr-2 overflow-y-auto pr-2')}>
              {view === 'table' ? (
                <ReservationsTable
                  key={`${tab}-${fresh.meta.page}`}
                  reservations={items}
                  ownerIdOf={() => user!.id}
                  onCancel={(r) => setCancelling(r)}
                  busy={loading}
                  sort={sort}
                  onSort={(field) => go({ sort: nextSort(sort, field) })}
                />
              ) : (
                <Stagger
                  as="ul"
                  key={`${tab}-${fresh.meta.page}`}
                  aria-busy={loading}
                  className={cn('flex flex-col gap-3 transition-opacity', loading && 'opacity-60')}
                >
                  {items.map((r) => (
                    <StaggerItem as="li" key={r.id}>
                      <ReservationRow reservation={r} ownerId={user!.id} onCancel={() => setCancelling(r)} />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
            <div className="shrink-0">
              <Pagination
                meta={fresh.meta}
                onPageChange={(p) => go({ page: p })}
                disabled={loading}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => go({ size })}
              />
            </div>
          </>
        )}
      </div>

      {/* A cancelled upcoming reservation stays in «Próximas» (marked as cancelled), so the page keeps its rows. */}
      <CancelReservationDialog reservation={cancelling} onClose={() => setCancelling(null)} onDone={reload} />
    </ViewportPage>
  )
}

/** One reservation as a card. `details` adds extra lines (the admin listing shows who booked it). */
export function ReservationRow({
  reservation: r,
  ownerId,
  onCancel,
  details,
}: {
  reservation: Reservation
  /** Who booked it: when someone else (an admin) cancelled it, the row says who. */
  ownerId: string
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
        <p className="font-semibold first-letter:uppercase">{formatDate(r.startsAt, tz)}</p>
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
        <ReservationBadges reservation={r} ownerId={ownerId} ongoing={ongoing} />
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
