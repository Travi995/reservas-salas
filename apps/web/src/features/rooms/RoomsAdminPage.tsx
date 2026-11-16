import { Clock, DoorOpen, MapPin, Pencil, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  cn,
} from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { notify } from '../../lib/notify'
import { zoneCity } from '../../lib/time'
import type { Room } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { RoomFormDialog } from './RoomFormDialog'
import { Stagger, StaggerItem } from '../../components/motion'

export function RoomsAdminPage() {
  const { data, error, loading, reload } = useAsync(() => api.rooms(true), [])
  const [editing, setEditing] = useState<{ room: Room | null } | null>(null)
  const [toggling, setToggling] = useState<Room | null>(null)

  const rooms = [...(data ?? [])].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  )

  return (
    <>
      <PageHeader
        title="Salas"
        description="Crea, edita y desactiva las salas de las oficinas."
        actions={
          <Button onClick={() => setEditing({ room: null })}>
            <Plus aria-hidden="true" className="size-4" /> Nueva sala
          </Button>
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
        <Stagger as="ul" className="flex flex-col gap-3">
          {rooms.map((room) => (
            <StaggerItem as="li" key={room.id}>
              <Card className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', !room.isActive && 'bg-muted')}>
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
    </>
  )
}
