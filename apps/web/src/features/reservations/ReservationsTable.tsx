import { Button, SortTh, Td, TableFrame, Th, Tr, cn } from '../../components/ui'
import type { SortState } from '../../lib/sort'
import { formatDate, formatTime, zoneLabel } from '../../lib/time'
import type { AdminReservation, Reservation, ReservationSortField } from '../../lib/types'
import { useNow } from '../../lib/useNow'
import { ReservationBadges } from './ReservationBadges'

type Row = Reservation | AdminReservation

/** The same reservations as the card view, as a table. `showUser` adds who booked it (admin listing). */
export function ReservationsTable({
  reservations,
  ownerIdOf,
  showUser,
  onCancel,
  busy,
  sort,
  onSort,
}: {
  reservations: Row[]
  ownerIdOf: (r: Row) => string
  showUser?: boolean
  onCancel: (r: Row) => void
  busy?: boolean
  sort: SortState<ReservationSortField> | null
  onSort: (field: ReservationSortField) => void
}) {
  const head = { sort, onSort }
  return (
    <TableFrame label="Reservas" busy={busy}>
      <thead>
        <tr>
          <SortTh label="Fecha" field="date" {...head} />
          <SortTh label="Horario" field="time" {...head} />
          <SortTh label="Título" field="title" {...head} />
          <SortTh label="Sala" field="room" {...head} />
          {showUser && <SortTh label="Persona" field="user" {...head} />}
          <SortTh label="Estado" field="status" {...head} />
          <Th className="text-right">
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {reservations.map((r) => (
          <ReservationTableRow
            key={r.id}
            r={r}
            ownerId={ownerIdOf(r)}
            showUser={showUser}
            onCancel={() => onCancel(r)}
          />
        ))}
      </tbody>
    </TableFrame>
  )
}

function ReservationTableRow({
  r,
  ownerId,
  showUser,
  onCancel,
}: {
  r: Row
  ownerId: string
  showUser?: boolean
  onCancel: () => void
}) {
  const tz = r.room.timezone
  const now = useNow()
  const cancelled = r.status === 'cancelled'
  const started = new Date(r.startsAt) <= now
  const ongoing = !cancelled && started && new Date(r.endsAt) > now
  const zone = zoneLabel(tz)
  const user = 'user' in r ? r.user : null

  return (
    <Tr>
      <Td className="font-medium whitespace-nowrap first-letter:uppercase">{formatDate(r.startsAt, tz)}</Td>
      <Td className="whitespace-nowrap text-muted-fg tabular-nums">
        {formatTime(r.startsAt, tz)}–{formatTime(r.endsAt, tz)}
        {zone && <span className="block text-xs">({zone})</span>}
      </Td>
      <Td className="max-w-[16rem]">
        <span className={cn('block truncate font-medium', cancelled && 'text-muted-fg line-through')} title={r.title}>
          {r.title}
        </span>
      </Td>
      <Td className="max-w-[14rem]">
        <span className="block truncate">{r.room.name}</span>
        <span className="block truncate text-xs text-muted-fg">{r.room.location}</span>
      </Td>
      {showUser && (
        <Td className="max-w-[14rem]">
          <span className="block truncate">{user?.name}</span>
          <span className="block truncate text-xs text-muted-fg">{user?.email}</span>
        </Td>
      )}
      <Td>
        <div className="flex flex-wrap gap-1.5">
          <ReservationBadges reservation={r} ownerId={ownerId} ongoing={ongoing} />
        </div>
      </Td>
      <Td className="text-right">
        {!cancelled && !started && (
          <Button
            variant="danger"
            size="sm"
            onClick={onCancel}
            aria-label={`Cancelar la reserva «${r.title}» del ${formatDate(r.startsAt, tz)} a las ${formatTime(r.startsAt, tz)}`}
          >
            Cancelar
          </Button>
        )}
      </Td>
    </Tr>
  )
}
