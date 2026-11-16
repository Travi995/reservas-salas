import { CalendarSearch, FilterX, Search, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Button,
  EmptyState,
  ErrorState,
  InputField,
  PageHeader,
  PageLoader,
  Pagination,
  Select,
  cn,
} from '../../components/ui'
import { Stagger, StaggerItem } from '../../components/motion'
import { api } from '../../lib/api'
import type { AdminReservation, ReservationScope, ReservationStatus } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useDebounced } from '../../lib/useDebounced'
import { CancelReservationDialog } from './CancelReservationDialog'
import { ReservationRow } from './MyReservationsPage'
import { pageFromParams } from './url-state'

const PAGE_SIZE = 10
const ALL = 'all'

const STATUS_OPTIONS = [
  { value: ALL, label: 'Todos los estados' },
  { value: 'active', label: 'Activas' },
  { value: 'cancelled', label: 'Canceladas' },
]
const SCOPE_OPTIONS = [
  { value: ALL, label: 'Todas las fechas' },
  { value: 'upcoming', label: 'Próximas' },
  { value: 'past', label: 'Pasadas' },
]

type FilterKey = 'q' | 'status' | 'scope' | 'room'

/**
 * Admin listing of every reservation. Search, filters and pagination are resolved by the API;
 * their state lives in the URL (?q=&status=&scope=&room=&page=) so reload, back and shared links keep it.
 */
export function AdminReservationsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = params.get('status') ?? ALL
  const scope = params.get('scope') ?? ALL
  const roomId = params.get('room') ?? ALL
  const page = pageFromParams(params)

  /** Changing any filter goes back to page 1; changing page keeps the filters. */
  const update = (changes: Partial<Record<FilterKey, string>> & { page?: number }) => {
    const { page: nextPage, ...filters } = changes
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(filters)) {
      if (!value || value === ALL) next.delete(key)
      else next.set(key, value)
    }
    if (nextPage && nextPage > 1) next.set('page', String(nextPage))
    else next.delete('page')
    setParams(next)
  }

  // The input is typed freely; the URL (and so the request) only follows once typing pauses.
  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    // The URL changed from outside (back/forward, «Quitar filtros»): show it in the input.
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const term = useDebounced(search.trim())
  useEffect(() => {
    if (term !== q) update({ q: term })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])
  const typing = search.trim() !== q

  const rooms = useAsync(() => api.rooms(true), [])
  const filterKey = JSON.stringify([q, status, scope, roomId])
  const { data, error, loading, reload } = useAsync(
    () =>
      api
        .adminReservations({
          page,
          pageSize: PAGE_SIZE,
          search: q || undefined,
          status: status === ALL ? undefined : (status as ReservationStatus),
          scope: scope === ALL ? undefined : (scope as ReservationScope),
          roomId: roomId === ALL ? undefined : roomId,
        })
        .then((res) => ({ filterKey, res })),
    [page, filterKey],
  )
  const [cancelling, setCancelling] = useState<AdminReservation | null>(null)

  const result = data?.res ?? null
  // Rows from other filters stay visible but dimmed while the new ones load (or while typing).
  const stale = loading || typing || data?.filterKey !== filterKey
  const outOfRange = result !== null && result.meta.totalPages > 0 && page > result.meta.totalPages

  const roomOptions = [
    { value: ALL, label: 'Todas las salas' },
    ...(rooms.data ?? []).map((r) => ({ value: r.id, label: r.isActive ? r.name : `${r.name} (inactiva)` })),
  ]
  const filtered = Boolean(q) || status !== ALL || scope !== ALL || roomId !== ALL

  return (
    <>
      <PageHeader title="Reservas" description="Todas las reservas de todas las salas. Busca, filtra y cancela." />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <InputField
            label="Buscar"
            type="search"
            placeholder="Título, sala, persona o email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
          />
          <Search aria-hidden="true" className="pointer-events-none absolute right-3 bottom-3.5 size-4 text-muted-fg" />
        </div>
        <Select label="Estado" options={STATUS_OPTIONS} value={status} onChange={(v) => update({ status: v })} />
        <Select label="Fecha" options={SCOPE_OPTIONS} value={scope} onChange={(v) => update({ scope: v })} />
        <Select label="Sala" options={roomOptions} value={roomId} onChange={(v) => update({ room: v })} />
      </div>
      {filtered && (
        <div className="mb-4 -mt-1 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams())}>
            <FilterX aria-hidden="true" className="size-4" /> Quitar filtros
          </Button>
        </div>
      )}

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !result ? (
        <PageLoader />
      ) : outOfRange ? (
        <EmptyState icon={CalendarSearch} title="Esta página ya no existe">
          <Button variant="secondary" size="sm" onClick={() => update({ page: result.meta.totalPages })}>
            Ir a la última página
          </Button>
        </EmptyState>
      ) : result.items.length === 0 ? (
        <div className={cn('transition-opacity', stale && 'opacity-60')}>
          <EmptyState icon={CalendarSearch} title={filtered ? 'Ninguna reserva coincide' : 'Todavía no hay reservas'}>
            {filtered && 'Prueba con otra búsqueda o quita algún filtro.'}
          </EmptyState>
        </div>
      ) : (
        <>
          <Stagger
            as="ul"
            key={`${data?.filterKey}-${result.meta.page}`}
            aria-busy={stale}
            className={cn('flex flex-col gap-3 transition-opacity', stale && 'opacity-60')}
          >
            {result.items.map((r) => (
              <StaggerItem as="li" key={r.id}>
                <ReservationRow
                  reservation={r}
                  ownerId={r.user.id}
                  onCancel={() => setCancelling(r)}
                  details={
                    <p className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-fg">
                      <UserRound aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">
                        {r.user.name} · {r.user.email}
                      </span>
                    </p>
                  }
                />
              </StaggerItem>
            ))}
          </Stagger>
          <Pagination meta={result.meta} onPageChange={(p) => update({ page: p })} disabled={stale} />
        </>
      )}

      <CancelReservationDialog
        reservation={cancelling && { ...cancelling, ownerName: cancelling.user.name }}
        onClose={() => setCancelling(null)}
        onDone={() => {
          // With «Activas» the cancelled one leaves the list: if it was alone on this page, go back one.
          if (status === 'active' && result?.items.length === 1 && page > 1) update({ page: page - 1 })
          else reload()
        }}
      />
    </>
  )
}
