import { Clock, MapPin, Users, X } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { formatTime, zoneLabel } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import type { ReservationSlot, Room, User } from '../../lib/types'
import { DayTimeline } from './DayTimeline'

interface RoomDayCardProps {
  room: Room
  slots: ReservationSlot[]
  user: User
  onReserve: () => void
  onCancel: (slot: ReservationSlot) => void
}

export function RoomDayCard({ room, slots, user, onReserve, onCancel }: RoomDayCardProps) {
  const now = useNow()
  // Times are shown in the room's zone; say so when it is not the viewer's.
  const zone = zoneLabel(room.timezone)
  const sorted = [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const canCancel = (s: ReservationSlot) =>
    (user.role === 'admin' || s.userId === user.id) && new Date(s.startsAt) > now

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{room.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-fg">
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden="true" className="size-4" /> {room.capacity} personas
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />{' '}
              <span className="truncate">{room.location}</span>
            </span>
            {zone && (
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-4" />{' '}
                <span className="inline-block first-letter:uppercase">{zone}</span>
              </span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={onReserve} aria-label={`Reservar ${room.name}`}>
          Reservar
        </Button>
      </div>

      <DayTimeline slots={sorted} timeZone={room.timezone} />

      {sorted.length === 0 ? (
        <p className="text-sm text-success">Libre todo el día.</p>
      ) : (
        <ul aria-label={`Horarios ocupados en ${room.name}`} className="flex flex-col divide-y divide-border">
          {sorted.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <Badge tone="danger">
                <span className="tabular-nums">
                  {formatTime(s.startsAt, room.timezone)}–{formatTime(s.endsAt, room.timezone)}
                </span>
              </Badge>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{s.title}</p>
                <p className="truncate text-muted-fg">{s.userId === user.id ? 'Tú' : s.userName}</p>
              </div>
              {canCancel(s) && (
                <button
                  type="button"
                  onClick={() => onCancel(s)}
                  aria-label={`Cancelar «${s.title}»`}
                  title="Cancelar reserva"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-fg hover:bg-danger-soft hover:text-danger"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
