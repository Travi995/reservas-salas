import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { spring } from '../../lib/motion'
import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** false for forms: a stray click outside must not discard what the user typed. Escape and the X still close. */
  closeOnBackdrop?: boolean
  /** The dialog holds unsaved input: closing with the X, Escape or the back button asks before discarding it. */
  dirty?: boolean
}

const DISCARD_QUESTION = 'Has empezado a rellenar el formulario. ¿Cerrar y descartar lo escrito?'
/** Marks the history entry pushed while a dialog is open, so the back button closes the dialog instead of leaving the page. */
const HISTORY_MARK = 'dialogOpen'
/** `history.back()` calls made by us (the dialog closed by other means): their popstate is not a user action. */
let ownBackSteps = 0

const isMarked = () => (window.history.state as Record<string, unknown> | null)?.[HISTORY_MARK] === true
const pushMark = () => window.history.pushState({ ...window.history.state, [HISTORY_MARK]: true }, '')

/**
 * Modal dialog on top of native <dialog>: focus trap, Escape and backdrop for free.
 * The browser's back button closes it (on a phone that is what «back» means with a sheet open).
 * On mobile it spans the full width from the bottom; from `sm` up it is centered.
 */
export function Dialog({ open, onClose, title, children, closeOnBackdrop = true, dirty = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Latest values for the listeners below, which are registered once per opening.
  const latest = useRef({ dirty, onClose })
  useEffect(() => {
    latest.current = { dirty, onClose }
  })

  /** A close the user asked for without an explicit «discard» button: confirm if there is unsaved input. */
  const requestClose = () => {
    if (latest.current.dirty && !window.confirm(DISCARD_QUESTION)) return
    latest.current.onClose()
  }

  useEffect(() => {
    if (!open) return
    pushMark()
    const onPopState = () => {
      if (ownBackSteps > 0) {
        ownBackSteps--
        return
      }
      if (latest.current.dirty && !window.confirm(DISCARD_QUESTION)) {
        pushMark() // stay: restore the entry the back button just consumed
        return
      }
      latest.current.onClose()
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      // Closed by a button or after saving: drop the entry we pushed.
      if (isMarked()) {
        ownBackSteps++
        window.history.back()
      }
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        // Escape: decide here instead of letting the browser close it.
        e.preventDefault()
        requestClose()
      }}
      onClick={(e) => closeOnBackdrop && e.target === ref.current && requestClose()}
      aria-labelledby="dialog-title"
      className="m-0 mt-auto max-h-[92svh] w-full max-w-none overflow-hidden rounded-t-2xl border border-border bg-surface p-0 text-fg backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      {open && (
        // The entrance animation moves the scroll container itself, not its content: moving the content
        // 24 px down made it overflow the dialog for a moment and flashed a scrollbar.
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
          className="max-h-[92svh] overflow-y-auto"
        >
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="dialog-title" className="text-lg font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Cerrar"
                className="-m-2 inline-flex size-11 items-center justify-center rounded-lg text-muted-fg hover:bg-muted hover:text-fg"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            {children}
          </div>
        </motion.div>
      )}
    </dialog>
  )
}
