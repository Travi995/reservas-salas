import { Badge } from '../../components/ui'
import type { Reservation } from '../../lib/types'

/** Status badges of a reservation, shared by the card and the table views. */
export function ReservationBadges({
  reservation: r,
  ownerId,
  ongoing,
}: {
  reservation: Reservation
  /** Who booked it: when someone else (an admin) cancelled it, the badge says who. */
  ownerId: string
  ongoing: boolean
}) {
  const cancelled = r.status === 'cancelled'
  return (
    <>
      {cancelled && (
        <Badge>
          {r.cancelledBy && r.cancelledBy.id !== ownerId ? `Cancelada por ${r.cancelledBy.name}` : 'Cancelada'}
        </Badge>
      )}
      {ongoing && <Badge tone="info">En curso</Badge>}
      {r.seriesId && <Badge tone="primary">Semanal</Badge>}
      {!r.room.isActive && <Badge tone="warning">Sala desactivada</Badge>}
    </>
  )
}
