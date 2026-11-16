import { cn } from './cn'

/** Marca: tres franjas horarias, la central ocupada. Mismo dibujo que public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="7" y="8" width="18" height="3.5" rx="1.75" className="fill-primary-fg" fillOpacity=".45" />
      <rect x="7" y="14.25" width="18" height="3.5" rx="1.75" className="fill-primary-fg" />
      <rect x="7" y="20.5" width="11" height="3.5" rx="1.75" className="fill-primary-fg" fillOpacity=".45" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-lg font-bold tracking-tight', className)}>
      <LogoMark />
      Salas
    </span>
  )
}
