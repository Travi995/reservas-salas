import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'
import { notify } from './notify'

/**
 * Aplica un error de la API a un formulario de react-hook-form:
 * - errores de campo (400 con `details`) → debajo de su campo;
 * - el resto (401, 404, 409, 422, red…) → toast global.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const details = error instanceof ApiError ? error.details.filter((d) => fields.includes(d.field as Path<T>)) : []
  details.forEach((d, i) =>
    setError(d.field as Path<T>, { type: 'server', message: d.message }, { shouldFocus: i === 0 }),
  )
  if (details.length === 0) notify.error(error)
}

/** Reglas comunes. Cada campo pasa su mensaje completo («Indica la fecha.») para que concuerde en género. */
export const rules = {
  required: (message: string) => ({ value: true, message }),
  email: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Introduce un email válido.' },
  notBlank: (message: string) => (v: string) => v.trim().length > 0 || message,
}
