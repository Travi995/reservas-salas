import { useEffect, useState, type ReactNode } from 'react'
import { errorMessage } from '../../lib/notify'
import { Alert } from './Alert'
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

/** A repeated tap that lands where the confirm button appears must not confirm by accident. */
const ARM_DELAY_MS = 500

/**
 * Confirmation for irreversible actions. If the API fails, the error is shown inside the dialog
 * (a toast would be hidden behind the modal backdrop) and the dialog stays open.
 */
export function ConfirmDialog({ open, title, onClose, ...body }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {/* Dialog only mounts its children while open, so every opening starts with clean state. */}
      <ConfirmBody onClose={onClose} {...body} />
    </Dialog>
  )
}

function ConfirmBody({
  children,
  confirmLabel,
  cancelLabel = 'Volver',
  tone = 'danger',
  onConfirm,
  onClose,
}: Omit<ConfirmDialogProps, 'open' | 'title'>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), ARM_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const confirm = async () => {
    if (!armed || loading) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="text-muted-fg">{children}</div>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </>
  )
}
