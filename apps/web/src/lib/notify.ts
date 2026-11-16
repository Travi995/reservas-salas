import { toast } from 'sonner'
import { ApiError } from './api'

/**
 * API única de alertas globales (toasts). Nadie llama a `toast` directamente:
 * así todos los mensajes tienen el mismo formato y duración.
 */
export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast.info(message),
  error: (error: unknown) => {
    const message = error instanceof ApiError ? error.message : 'Ha ocurrido un error inesperado.'
    // Mismo id por mensaje: si el usuario repite la acción no se apilan toasts iguales.
    toast.error(message, { id: message })
  },
}
