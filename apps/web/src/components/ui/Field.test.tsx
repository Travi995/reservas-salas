import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputField } from './Field'

describe('InputField type=number', () => {
  it('ignores e, signs and separators while typing, and keeps digits', async () => {
    render(<InputField label="Capacidad" type="number" />)
    const input = screen.getByLabelText('Capacidad')
    await userEvent.type(input, '1e-+.,28')
    expect(input).toHaveValue(128)
  })

  it('still lets other field types take those characters', async () => {
    render(<InputField label="Nombre" />)
    const input = screen.getByLabelText('Nombre')
    await userEvent.type(input, 'e-1')
    expect(input).toHaveValue('e-1')
  })

  it('accepts a decimal point when the step is fractional', async () => {
    render(<InputField label="Horas" type="number" step="0.5" />)
    const input = screen.getByLabelText('Horas')
    await userEvent.type(input, '1.5e')
    expect(input).toHaveValue(1.5)
  })
})
