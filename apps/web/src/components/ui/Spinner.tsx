import { LoaderCircle } from 'lucide-react'
import { cn } from './cn'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('animate-spin', className)} />
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted-fg">
      <Spinner className="size-5" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
