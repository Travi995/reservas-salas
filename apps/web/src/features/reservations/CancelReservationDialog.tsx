import { ConfirmDialog } from '../../components/ui'
import { ApiError, api } from '../../lib/api'
import { notify } from '../../lib/notify'
import { formatDate, formatTime, zoneLabel } from '../../lib/time'
import type { AdminReservation, Reservation } from '../../lib/types'

interface CancelReservationDialogProps {
  reservation: Reservation | AdminReservation | null
  onClose: () => void
  /** Called after the cancellation, and also when it turns out to be stale (already cancelled or started). */
  onDone: () => void
}

/** Codes that mean "the list you are looking at is out of date", not "try again". */
const STALE = new Set(['ALREADY_CANCELLED', 'ALREADY_STARTED', 'RESERVATION_NOT_FOUND'])

/**
 * Confirmation that spells out the consequence: irreversible, and the room becomes free.
 * If another tab (or a retry after a lost response) already cancelled it, close and refresh instead of
 * leaving the dialog open over a stale list.
 */
export function CancelReservationDialog({ reservation: r, onClose, onDone }: CancelReservationDialogProps) {
  const owner = r && 'user' in r ? r.user.name : null
  const tz = r?.room.timezone ?? 'UTC'
  const zone = r ? zoneLabel(tz) : null

  return (
    <ConfirmDialog
      open={r !== null}
      title="¿Cancelar esta reserva?"
      confirmLabel="Sí, cancelar reserva"
      cancelLabel="No, mantenerla"
      onClose={onClose}
      onConfirm={async () => {
        try {
          await api.cancelReservation(r!.id)
          notify.success(`Reserva «${r!.title}» cancelada. La sala ya está libre en ese horario.`)
        } catch (e) {
          if (!(e instanceof ApiError) || !STALE.has(e.code)) throw e
          notify.info(e.message)
        }
        onDone()
      }}
    >
      {r && (
        <div className="flex flex-col gap-2">
          <p>
            «{r.title}»{owner && <> de {owner}</>} en {r.room.name}, {formatDate(r.startsAt, tz)} de{' '}
            {formatTime(r.startsAt, tz)} a {formatTime(r.endsAt, tz)}
            {zone && <> ({zone})</>}.
          </p>
          <p>
            La sala quedará libre para otras personas. <strong className="text-fg">No se puede deshacer</strong>: si la
            necesitas de nuevo tendrás que volver a reservarla.
          </p>
        </div>
      )}
    </ConfirmDialog>
  )
}
