import { Clock, DoorOpen, MapPin, Pencil, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Pagination,
  SortTh,
  Td,
  TableFrame,
  Th,
  Tr,
  ViewToggle,
  ViewportPage,
  cn,
} from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { notify } from '../../lib/notify'
import { zoneCity } from '../../lib/time'
import type { Room } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { useViewMode } from '../../lib/useViewMode'
import { compareValues, nextSort, sortFromParams, writeSortParams, type SortState } from '../../lib/sort'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, pageFromParams, pageSizeFromParams } from '../reservations/url-state'
import { RoomFormDialog } from './RoomFormDialog'
import { Stagger, StaggerItem } from '../../components/motion'

const ROOM_SORT_FIELDS = ['name', 'capacity', 'location', 'timezone', 'status'] as const
type RoomSortField = (typeof ROOM_SORT_FIELDS)[number]

const ROOM_SORT_VALUE: Record<RoomSortField, (room: Room) => string | number> = {
  name: (r) => r.name,
  capacity: (r) => r.capacity,
  location: (r) => r.location,
  timezone: (r) => zoneCity(r.timezone),
  status: (r) => (r.isActive ? 0 : 1),
}

export function RoomsAdminPage() {
  const { data, error, loading, reload } = useAsync(() => api.rooms(true), [])
  const [editing, setEditing] = useState<{ room: Room | null } | null>(null)
  const [toggling, setToggling] = useState<Room | null>(null)
  const [view, setView] = useViewMode()
  // The room list is small, so the API returns it whole and the browser sorts and pages it.
  // Page, size and order live in the URL, like in the reservation listings.
  const [params, setParams] = useSearchParams()
  const sort = sortFromParams(params, ROOM_SORT_FIELDS)
  const pageSize = pageSizeFromParams(params)
  const go = (next: { page?: number; size?: number; sort?: SortState<RoomSortField> | null }) => {
    const q = new URLSearchParams()
    const page = next.page ?? 1
    const size = next.size ?? pageSize
    if (page > 1) q.set('page', String(page))
    if (size !== DEFAULT_PAGE_SIZE) q.set('size', String(size))
    writeSortParams(q, next.sort === undefined ? sort : next.sort)
    setParams(q)
  }
  const onSort = (field: RoomSortField) => go({ sort: nextSort(sort, field) })

  const rooms = [...(data ?? [])].sort((a, b) => {
    if (!sort) {
      return Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    }
    const result = compareValues(ROOM_SORT_VALUE[sort.by](a), ROOM_SORT_VALUE[sort.by](b))
    return (sort.dir === 'asc' ? result : -result) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  })

  // A page that no longer exists (e.g. after a shorter list) shows the last one.
  const totalPages = Math.ceil(rooms.length / pageSize)
  const page = Math.min(pageFromParams(params), Math.max(totalPages, 1))
  const pageRooms = rooms.slice((page - 1) * pageSize, page * pageSize)
  const meta = { page, pageSize, totalItems: rooms.length, totalPages }

  return (
    <ViewportPage>
      <PageHeader
        compact
        title="Salas"
        description="Crea, edita y desactiva las salas de las oficinas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <Button onClick={() => setEditing({ room: null })}>
              <Plus aria-hidden="true" className="size-4" /> Nueva sala
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Todavía no hay salas">
          Crea la primera con «Nueva sala».
        </EmptyState>
      ) : (
        <>
          {/* Only this area scrolls; the header above and the pagination below stay in place. */}
          <div className={cn('min-h-0 flex-1', view === 'cards' && '-mr-2 overflow-y-auto pr-2')}>
            {view === 'table' ? (
              <TableFrame label="Salas">
                <thead>
                  <tr>
                    <SortTh label="Sala" field="name" sort={sort} onSort={onSort} />
                    <SortTh label="Capacidad" field="capacity" sort={sort} onSort={onSort} />
                    <SortTh label="Ubicación" field="location" sort={sort} onSort={onSort} />
                    <SortTh label="Zona horaria" field="timezone" sort={sort} onSort={onSort} />
                    <SortTh label="Estado" field="status" sort={sort} onSort={onSort} />
                    <Th className="text-right">
                      <span className="sr-only">Acciones</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRooms.map((room) => (
                    <Tr key={room.id} className={cn(!room.isActive && 'bg-muted/60')}>
                      <Td className="max-w-[14rem] truncate font-semibold">{room.name}</Td>
                      <Td className="whitespace-nowrap tabular-nums">{room.capacity} personas</Td>
                      <Td className="max-w-[16rem] truncate">{room.location}</Td>
                      <Td className="whitespace-nowrap text-muted-fg">Hora de {zoneCity(room.timezone)}</Td>
                      <Td>{room.isActive ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}</Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditing({ room })}
                            aria-label={`Editar ${room.name}`}
                          >
                            <Pencil aria-hidden="true" className="size-4" /> Editar
                          </Button>
                          <Button
                            variant={room.isActive ? 'danger' : 'secondary'}
                            size="sm"
                            onClick={() => setToggling(room)}
                            aria-label={`${room.isActive ? 'Desactivar' : 'Activar'} ${room.name}`}
                          >
                            {room.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableFrame>
            ) : (
              <Stagger as="ul" className="flex flex-col gap-3">
                {pageRooms.map((room) => (
                  <StaggerItem as="li" key={room.id}>
                    <Card
                      className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', !room.isActive && 'bg-muted')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{room.name}</p>
                          {room.isActive ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-fg">
                          <span className="inline-flex items-center gap-1">
                            <Users aria-hidden="true" className="size-4" /> {room.capacity} personas
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin aria-hidden="true" className="size-4 shrink-0" />{' '}
                            <span className="truncate">{room.location}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock aria-hidden="true" className="size-4" /> Hora de {zoneCity(room.timezone)}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditing({ room })}
                          className="flex-1 sm:flex-none"
                          aria-label={`Editar ${room.name}`}
                        >
                          <Pencil aria-hidden="true" className="size-4" /> Editar
                        </Button>
                        <Button
                          variant={room.isActive ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => setToggling(room)}
                          className="flex-1 sm:flex-none"
                          aria-label={`${room.isActive ? 'Desactivar' : 'Activar'} ${room.name}`}
                        >
                          {room.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
          <div className="shrink-0">
            <Pagination
              meta={meta}
              onPageChange={(p) => go({ page: p })}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => go({ size })}
            />
          </div>
        </>
      )}

      <RoomFormDialog
        open={editing !== null}
        room={editing?.room ?? null}
        onClose={() => setEditing(null)}
        onSaved={(room) => {
          notify.success(editing?.room ? `Sala «${room.name}» actualizada.` : `Sala «${room.name}» creada.`)
          setEditing(null)
          reload()
        }}
        onStale={reload}
      />

      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.isActive ? `¿Desactivar «${toggling.name}»?` : `¿Activar «${toggling?.name}»?`}
        confirmLabel={toggling?.isActive ? 'Sí, desactivar sala' : 'Sí, activar sala'}
        cancelLabel={toggling?.isActive ? 'No, dejarla activa' : 'No, dejarla inactiva'}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        onClose={() => setToggling(null)}
        onConfirm={async () => {
          try {
            const room = await api.updateRoom(toggling!.id, {
              isActive: !toggling!.isActive,
              version: toggling!.version,
            })
            notify.success(`Sala «${room.name}» ${room.isActive ? 'activada' : 'desactivada'}.`)
          } catch (e) {
            // Changed by another admin meanwhile: refresh the list behind before showing the error.
            if (e instanceof ApiError && e.code === 'ROOM_MODIFIED') reload()
            throw e
          }
          reload()
        }}
      >
        {toggling?.isActive ? (
          <div className="flex flex-col gap-2">
            <p>Dejará de aceptar reservas nuevas y no aparecerá en Disponibilidad.</p>
            <p>
              Las reservas que ya tiene <strong className="text-fg">se mantienen</strong> (las futuras también): si no
              deben celebrarse, cancélalas una a una en Reservas. Puedes volver a activarla cuando quieras.
            </p>
          </div>
        ) : (
          <p>Volverá a aceptar reservas y a aparecer en Disponibilidad.</p>
        )}
      </ConfirmDialog>
    </ViewportPage>
  )
}
