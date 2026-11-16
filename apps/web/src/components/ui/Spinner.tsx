import { LoaderCircle } from 'lucide-react'
import { cn } from './cn'
import { SlotsLoader } from './SlotsLoader'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('animate-spin', className)} />
}

export function PageLoader({ label = 'Cargando…', fullscreen }: { label?: string; fullscreen?: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-fg',
        fullscreen ? 'min-h-svh' : 'py-16',
      )}
    >
      <SlotsLoader />
      <span className="text-sm">{label}</span>
    </div>
  )
}
