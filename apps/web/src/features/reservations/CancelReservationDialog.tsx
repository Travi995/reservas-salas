import { useRef } from 'react'
import { ConfirmDialog, focusPageHeading } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { notify } from '../../lib/notify'
import { formatDate, formatTime, zoneLabel } from '../../lib/time'
import type { Room } from '../../lib/types'

/** What the dialog needs to describe a reservation, whichever screen it comes from. */
export interface CancelTarget {
  id: string
  title: string
  startsAt: string
  endsAt: string
  room: Room
  /** Name of whoever booked it, when it is not the current user (an admin cancelling someone else's). */
  ownerName?: string
}

interface CancelReservationDialogProps {
  reservation: CancelTarget | null
  onClose: () => void
  /** Called after the cancellation, and also when it turns out to be stale (already cancelled or started). */
  onDone: () => void
}

/** Codes that mean "the list you are looking at is out of date", not "try again". */
const STALE = new Set(['ALREADY_CANCELLED', 'ALREADY_STARTED', 'RESERVATION_NOT_FOUND'])

/**
 * The only confirmation for cancelling, shared by every screen (lists, availability, calendar).
 * It spells out the consequence: irreversible, and the room becomes free.
 * If another tab (or a retry after a lost response) already cancelled it, close and refresh instead of
 * leaving the dialog open over a stale view.
 */
export function CancelReservationDialog({ reservation: r, onClose, onDone }: CancelReservationDialogProps) {
  const tz = r?.room.timezone ?? 'UTC'
  const zone = r ? zoneLabel(tz) : null
  const cancelled = useRef(false)

  return (
    <ConfirmDialog
      open={r !== null}
      title={r?.ownerName ? `¿Cancelar la reserva de ${r.ownerName}?` : '¿Cancelar esta reserva?'}
      confirmLabel="Sí, cancelar reserva"
      cancelLabel="No, mantenerla"
      onClose={() => {
        onClose()
        // The button that opened the dialog goes away with the reservation: without this the focus
        // would fall back to <body> and keyboard users would start again from the top of the page.
        if (cancelled.current) setTimeout(focusPageHeading)
        cancelled.current = false
      }}
      onConfirm={async () => {
        try {
          await api.cancelReservation(r!.id)
          notify.success(`Reserva «${r!.title}» cancelada. La sala ya está libre en ese horario.`)
        } catch (e) {
          if (!(e instanceof ApiError) || !STALE.has(e.code)) throw e
          notify.info(e.message)
        }
        cancelled.current = true
        onDone()
      }}
    >
      {r && (
        <div className="flex flex-col gap-2">
          <p>
            «{r.title}»{r.ownerName && <> de {r.ownerName}</>} en {r.room.name}, {formatDate(r.startsAt, tz)} de{' '}
            {formatTime(r.startsAt, tz)} a {formatTime(r.endsAt, tz)}
            {zone && <> ({zone})</>}.
          </p>
          <p>
            La sala quedará libre para otras personas. <strong className="text-fg">No se puede deshacer</strong>:{' '}
            {r.ownerName
              ? `${r.ownerName} tendrá que volver a reservarla, y la aplicación no le avisa: díselo tú.`
              : 'si la necesitas de nuevo tendrás que volver a reservarla.'}
          </p>
        </div>
      )}
    </ConfirmDialog>
  )
}
