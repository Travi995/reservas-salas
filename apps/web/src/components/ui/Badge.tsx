import type { ReactNode } from 'react'
import { cn } from './cn'

type Tone = 'neutral' | 'success' | 'danger' | 'primary' | 'info' | 'warning'

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-fg',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-primary-soft text-primary',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
