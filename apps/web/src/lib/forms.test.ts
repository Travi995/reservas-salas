import { toast } from 'sonner'
import { ApiError } from './api'
import { applyApiError } from './forms'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

describe('applyApiError', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pone los errores de campo de la API debajo de su campo, sin toast', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Datos inválidos', [
      { field: 'email', message: 'Email no válido' },
    ])
    applyApiError(error, setError, ['email', 'password'])
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'Email no válido' },
      { shouldFocus: true },
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('muestra un toast con el mensaje de la API si no hay error de campo (p. ej. 409)', () => {
    const setError = vi.fn()
    applyApiError(new ApiError(409, 'ROOM_OVERLAP', 'La sala ya está reservada.'), setError, ['title'])
    expect(setError).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('La sala ya está reservada.', { id: 'La sala ya está reservada.' })
  })
})
