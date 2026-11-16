import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

const CONTROL =
  'h-11 w-full min-w-0 rounded-lg border bg-surface px-3 text-base text-fg transition-colors duration-150 placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60'

interface FieldShellProps {
  label: string
  error?: string
  hint?: string
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
  className?: string
}

/** Visible label + control + help/error linked via aria-describedby. */
function FieldShell({ label, error, hint, children, className }: FieldShellProps) {
  const id = useId()
  const msgId = `${id}-msg`
  const message = error ?? hint
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children({ id, describedBy: message ? msgId : undefined, invalid: Boolean(error) })}
      {message && (
        <p id={msgId} className={cn('text-sm', error ? 'text-danger' : 'text-muted-fg')}>
          {message}
        </p>
      )}
    </div>
  )
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function InputField({ label, error, hint, className, ...props }: InputFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL, invalid ? 'border-danger' : 'border-control')}
          {...props}
        />
      )}
    </FieldShell>
  )
}
