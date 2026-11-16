import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'
import { errorMessage, notify } from './notify'

/**
 * Applies an API error to a react-hook-form form:
 * - field errors (`details` naming a field of the form) → below their field;
 * - everything else (401, 404, 409, 422, network…) → `onFormError` (an inline alert in the form),
 *   or a global toast when the form has no place for it.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  onFormError?: (message: string) => void,
) {
  const details = error instanceof ApiError ? error.details.filter((d) => fields.includes(d.field as Path<T>)) : []
  details.forEach((d, i) =>
    setError(d.field as Path<T>, { type: 'server', message: d.message }, { shouldFocus: i === 0 }),
  )
  if (details.length > 0) return
  if (onFormError) onFormError(errorMessage(error))
  else notify.error(error)
}

/** Shared rules. Each field passes its full message («Indica la fecha.») so that it agrees in grammatical gender. */
export const rules = {
  required: (message: string) => ({ value: true, message }),
  email: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Introduce un email válido.' },
  notBlank: (message: string) => (v: string) => v.trim().length > 0 || message,
}
