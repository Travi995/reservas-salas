import { useId, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
}

/** Native checkbox (keyboard and screen readers for free) with a visible label and optional hint. */
export function Checkbox({ label, hint, className, ...props }: CheckboxProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-sm text-muted-fg">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
