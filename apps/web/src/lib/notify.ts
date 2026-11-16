import { toast } from 'sonner'
import { ApiError } from './api'

/** User-facing text of any error: the API message, or a generic one for unexpected failures. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Ha ocurrido un error inesperado.'
}

/**
 * Single API for global alerts (toasts). Nobody calls `toast` directly,
 * so every message has the same format and duration.
 *
 * Inside a dialog use an inline <Alert> instead: a modal <dialog> lives in the browser's top layer,
 * so a toast would be painted behind its backdrop.
 */
export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast.info(message),
  error: (error: unknown) => {
    const message = errorMessage(error)
    // Same id per message: if the user repeats the action, identical toasts don't stack.
    toast.error(message, { id: message })
  },
}
