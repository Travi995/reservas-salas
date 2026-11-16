import { DoorOpen, MapPin, Pencil, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, PageLoader, cn } from '../../components/ui'
import { api } from '../../lib/api'
import { notify } from '../../lib/notify'
import type { Room } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { RoomFormDialog } from './RoomFormDialog'
import { Stagger, StaggerItem } from '../../components/motion'

export function RoomsAdminPage() {
  const { data, error, loading, reload } = useAsync(() => api.rooms(true), [])
  const [editing, setEditing] = useState<{ room: Room | null } | null>(null)
  const [toggling, setToggling] = useState<Room | null>(null)

  const rooms = [...(data ?? [])].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name),
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
        <Alert>{error.message}</Alert>
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
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditing({ room })}
                    className="flex-1 sm:flex-none"
                  >
                    <Pencil aria-hidden="true" className="size-4" /> Editar
                  </Button>
                  <Button
                    variant={room.isActive ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => setToggling(room)}
                    className="flex-1 sm:flex-none"
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
      />

      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.isActive ? 'Desactivar sala' : 'Activar sala'}
        confirmLabel={toggling?.isActive ? 'Desactivar' : 'Activar'}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        onClose={() => setToggling(null)}
        onConfirm={async () => {
          const room = await api.updateRoom(toggling!.id, { isActive: !toggling!.isActive })
          notify.success(`Sala «${room.name}» ${room.isActive ? 'activada' : 'desactivada'}.`)
          reload()
        }}
      >
        {toggling?.isActive ? (
          <p>«{toggling.name}» dejará de aceptar reservas nuevas. Las reservas pasadas se seguirán viendo.</p>
        ) : (
          <p>«{toggling?.name}» volverá a aceptar reservas.</p>
        )}
      </ConfirmDialog>
    </>
  )
}
