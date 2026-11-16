import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'
import { allowsDecimals, blockDrop, blockNonNumericKey, sanitizePaste } from './numeric-input'

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

export function InputField({
  label,
  error,
  hint,
  className,
  type,
  onKeyDown,
  onPaste,
  onDrop,
  ...props
}: InputFieldProps) {
  const isPassword = type === 'password'
  const isNumber = type === 'number'
  const decimals = isNumber && allowsDecimals(props.step)
  const [visible, setVisible] = useState(false)
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type={isPassword && visible ? 'text' : type}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(CONTROL, invalid ? 'border-danger' : 'border-control', isPassword && 'pr-11')}
            {...props}
            // Number fields take only digits: no «e», signs or separators (typed, pasted or dropped).
            onKeyDown={(e) => {
              if (isNumber) blockNonNumericKey(e, decimals)
              onKeyDown?.(e)
            }}
            onPaste={(e) => {
              if (isNumber) sanitizePaste(e, decimals)
              onPaste?.(e)
            }}
            onDrop={(e) => {
              if (isNumber) blockDrop(e)
              onDrop?.(e)
            }}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={visible}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-fg transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            </button>
          )}
        </div>
      )}
    </FieldShell>
  )
}
