import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../../lib/auth'
import { RegisterPage } from './RegisterPage'

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </AuthProvider>,
  )

describe('RegisterPage', () => {
  it('validates each field and shows the error below it without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'no-es-un-email')
    await userEvent.type(screen.getByLabelText('Contraseña'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Indica tu nombre.')).toBeInTheDocument()
    expect(screen.getByText('Introduce un email válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
