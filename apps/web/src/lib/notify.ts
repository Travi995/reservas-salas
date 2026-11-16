import { toast } from 'sonner'
import { ApiError } from './api'

/**
 * Single API for global alerts (toasts). Nobody calls `toast` directly,
 * so every message has the same format and duration.
 */
export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast.info(message),
  error: (error: unknown) => {
    const message = error instanceof ApiError ? error.message : 'Ha ocurrido un error inesperado.'
    // Same id per message: if the user repeats the action, identical toasts don't stack.
    toast.error(message, { id: message })
  },
}
