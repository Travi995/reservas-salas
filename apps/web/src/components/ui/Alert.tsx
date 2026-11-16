import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ease } from '../../lib/motion'
import { cn } from './cn'

type Tone = 'danger' | 'success' | 'info'

const TONES: Record<Tone, { box: string; Icon: typeof Info }> = {
  danger: { box: 'border-danger/30 bg-danger-soft text-danger', Icon: CircleAlert },
  success: { box: 'border-success/30 bg-success-soft text-success', Icon: CircleCheck },
  info: { box: 'border-info/30 bg-info-soft text-info', Icon: Info },
}

/** Mensaje en línea. Los errores se anuncian a lectores de pantalla (role=alert). */
export function Alert({
  tone = 'danger',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  const { box, Icon } = TONES[tone]
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ease}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', box, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </motion.div>
  )
}
