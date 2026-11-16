import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-control bg-surface text-fg hover:bg-muted',
  ghost: 'text-muted-fg hover:bg-muted hover:text-fg',
  danger: 'border border-danger/60 bg-surface text-danger hover:bg-danger-soft',
}

// md = 44px (minimum touch target). sm is also 44px on touch layouts and 36px from `sm` up (dense rows with a mouse).
const SIZES: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  sm: 'h-11 px-3 text-sm sm:h-9',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-[color,background-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}
