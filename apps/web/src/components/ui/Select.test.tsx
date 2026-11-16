import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionGlobalConfig } from 'motion/react'
import { useState } from 'react'
import { Select, type SelectProps } from './Select'

const OPTIONS = [
  { value: 'a', label: 'Aurora', description: '8 personas' },
  { value: 'b', label: 'Boreal' },
  { value: 'c', label: 'Cumbre' },
  { value: 'c2', label: 'Cosmos' },
]

/** Controlled wrapper, as react-hook-form's Controller would drive it. */
function Harness({ onChange, initial = '', ...props }: Partial<SelectProps> & { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <Select
      label="Sala"
      options={OPTIONS}
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
    />
  )
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
})
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false
})

const listboxGone = () => waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())

describe('Select', () => {
  it('links the visible label and the error message to the combobox', () => {
    render(<Harness error="Elige una sala." />)
    const combobox = screen.getByRole('combobox', { name: 'Sala' })
    expect(combobox).toHaveAttribute('aria-invalid', 'true')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).toHaveAccessibleDescription('Elige una sala.')
    expect(screen.getByText('Elige una sala.')).toHaveClass('text-danger')
    expect(combobox).toHaveTextContent('Selecciona una opción')
  })

  it('shows a hint without marking the field invalid', () => {
    render(<Harness hint="Opcional" />)
    const combobox = screen.getByRole('combobox', { name: 'Sala' })
    expect(combobox).not.toHaveAttribute('aria-invalid')
    expect(combobox).toHaveAccessibleDescription('Opcional')
  })

  it('opens with the keyboard, moves with arrows/Home/End and selects with Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial="b" />)
    const combobox = screen.getByRole('combobox', { name: 'Sala' })

    await user.tab()
    await user.keyboard('{ArrowDown}')
    const listbox = screen.getByRole('listbox')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox).toHaveAttribute('aria-controls', listbox.id)
    // Opens on the selected option.
    const active = () => document.getElementById(combobox.getAttribute('aria-activedescendant')!)
    expect(active()).toHaveTextContent('Boreal')
    expect(screen.getByRole('option', { name: /Boreal/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(active()).toHaveTextContent('Cumbre')
    await user.keyboard('{End}')
    expect(active()).toHaveTextContent('Cosmos')
    await user.keyboard('{ArrowDown}') // stays on the last one
    expect(active()).toHaveTextContent('Cosmos')
    await user.keyboard('{Home}')
    expect(active()).toHaveTextContent('Aurora')
    await user.keyboard('{ArrowUp}') // stays on the first one
    expect(active()).toHaveTextContent('Aurora')

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('a')
    await listboxGone()
    expect(combobox).toHaveFocus()
    expect(combobox).toHaveTextContent('Aurora')
    expect(combobox).not.toHaveAttribute('aria-activedescendant')
  })

  it('selects with Space and supports type-ahead by first letter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const combobox = screen.getByRole('combobox', { name: 'Sala' })
    combobox.focus()

    // Typing on the closed combobox opens it on the first match.
    await user.keyboard('c')
    const active = () => document.getElementById(combobox.getAttribute('aria-activedescendant')!)
    expect(active()).toHaveTextContent('Cumbre')
    // Repeating the letter cycles through matches.
    await user.keyboard('c')
    expect(active()).toHaveTextContent('Cosmos')

    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith('c2')
    await listboxGone()
  })

  it('selects with the mouse and marks the selected option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('combobox', { name: 'Sala' }))
    expect(screen.getByText('8 personas')).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /Cumbre/ }))
    expect(onChange).toHaveBeenCalledWith('c')
    await listboxGone()

    await user.click(screen.getByRole('combobox', { name: 'Sala' }))
    expect(screen.getByRole('option', { name: /Cumbre/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: /Aurora/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('closes on Escape without letting the event reach a parent (e.g. a <dialog>)', async () => {
    const user = userEvent.setup()
    const parentKeyDown = vi.fn()
    const onChange = vi.fn()
    render(
      <div onKeyDown={parentKeyDown}>
        <Harness onChange={onChange} />
      </div>,
    )
    const combobox = screen.getByRole('combobox', { name: 'Sala' })

    await user.click(combobox)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    parentKeyDown.mockClear()
    await user.keyboard('{Escape}')
    await listboxGone()
    expect(parentKeyDown).not.toHaveBeenCalled()
    expect(combobox).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes on outside click and on Tab, calling onBlur when focus leaves', async () => {
    const user = userEvent.setup()
    const onBlur = vi.fn()
    render(
      <>
        <Harness onBlur={onBlur} />
        <button type="button">Fuera</button>
      </>,
    )

    await user.click(screen.getByRole('combobox', { name: 'Sala' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(document.body)
    await listboxGone()

    await user.click(screen.getByRole('combobox', { name: 'Sala' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.tab()
    await listboxGone()
    expect(screen.getByRole('button', { name: 'Fuera' })).toHaveFocus()
    expect(onBlur).toHaveBeenCalled()
  })

  it('does not open when disabled and forwards the ref to the trigger', async () => {
    const user = userEvent.setup()
    const ref = { current: null as HTMLButtonElement | null }
    render(<Harness disabled ref={ref} name="roomId" initial="a" />)
    const combobox = screen.getByRole('combobox', { name: 'Sala' })

    expect(ref.current).toBe(combobox)
    await user.click(combobox)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(document.querySelector('input[type="hidden"][name="roomId"]')).toHaveValue('a')
  })
})
