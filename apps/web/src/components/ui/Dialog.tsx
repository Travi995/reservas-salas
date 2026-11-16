import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { spring } from '../../lib/motion'
import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Diálogo modal sobre <dialog> nativo: foco atrapado, Escape y backdrop gratis.
 * En móvil ocupa el ancho completo desde abajo; desde `sm` va centrado.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

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
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-0 mt-auto max-h-[92svh] w-full max-w-none rounded-t-2xl border border-border bg-surface p-0 text-fg backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
          className="flex flex-col gap-4 p-4 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-m-2 inline-flex size-11 items-center justify-center rounded-lg text-muted-fg hover:bg-muted hover:text-fg"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </dialog>
  )
}
