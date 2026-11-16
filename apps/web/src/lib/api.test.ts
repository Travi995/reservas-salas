import { ApiError, api, request, setUnauthorizedHandler, tokenStore } from './api'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('cliente API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    localStorage.clear()
  })

  it('envía el JWT como Bearer token', async () => {
    tokenStore.set('abc.def.ghi')
    fetchMock.mockResolvedValue(json(200, { id: '1' }))
    await api.me()
    const headers = fetchMock.mock.calls[0][1]!.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer abc.def.ghi')
  })

  it('convierte el formato de error de la API en ApiError', async () => {
    fetchMock.mockResolvedValue(
      json(409, { error: { code: 'ROOM_OVERLAP', message: 'La sala ya está reservada de 10:00 a 11:00' } }),
    )
    const error = await request('/reservations', { method: 'POST', body: '{}' }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'ROOM_OVERLAP',
      message: 'La sala ya está reservada de 10:00 a 11:00',
    })
  })

  it('usa un mensaje entendible si el cuerpo no trae uno', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 403 }))
    await expect(request('/rooms')).rejects.toMatchObject({
      status: 403,
      message: 'No tienes permiso para hacer esto.',
    })
  })

  it('cierra la sesión ante un 401 con token, pero no en el login', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    fetchMock.mockResolvedValue(
      json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos.' } }),
    )
    await expect(api.login('a@b.com', 'x')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()

    tokenStore.set('caducado')
    fetchMock.mockResolvedValue(json(401, { error: { code: 'UNAUTHORIZED', message: 'Sesión expirada.' } }))
    await expect(api.me()).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('traduce un fallo de red a un mensaje claro', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.me()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
