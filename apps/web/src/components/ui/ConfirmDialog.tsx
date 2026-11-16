import { useState, type ReactNode } from 'react'
import { notify } from '../../lib/notify'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** Label of the safe option; say what is kept ("No, mantenerla") rather than a bare "Volver". */
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** Confirmation for irreversible actions. If the API fails, an error toast is shown and the dialog stays open. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Volver',
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  const close = onClose

  const confirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      close()
    } catch (e) {
      notify.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} title={title}>
      <div className="text-muted-fg">{children}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
