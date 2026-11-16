import { ApiError, api, request, setUnauthorizedHandler, tokenStore } from './api'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('API client', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    localStorage.clear()
  })

  it('sends the JWT as a Bearer token', async () => {
    tokenStore.set('abc.def.ghi')
    fetchMock.mockResolvedValue(json(200, { id: '1' }))
    await api.me()
    const headers = fetchMock.mock.calls[0][1]!.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer abc.def.ghi')
  })

  it('converts the API error format into an ApiError', async () => {
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

  it('uses a readable message when the body has none', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 403 }))
    await expect(request('/rooms')).rejects.toMatchObject({
      status: 403,
      message: 'No tienes permiso para hacer esto.',
    })
  })

  it('logs out on a 401 with a token, but not on login', async () => {
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

  it('turns a network failure into a clear message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.me()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
