import { useState, type ReactNode } from 'react'
import { notify } from '../../lib/notify'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** Confirmación para acciones irreversibles. Si la API falla, toast de error y el diálogo sigue abierto. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
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
          Volver
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
