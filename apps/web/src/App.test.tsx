import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('incrementa el contador al hacer clic', async () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })

    await userEvent.click(button)

    expect(button).toHaveTextContent('Count is 1')
  })
})
