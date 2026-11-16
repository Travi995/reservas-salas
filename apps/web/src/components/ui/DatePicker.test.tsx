import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionGlobalConfig } from 'motion/react'
import { useState } from 'react'
import { DatePicker, type DatePickerProps } from './DatePicker'
import { addMonths, parseISODate, toISODate } from './date-utils'

/** Controlled wrapper, as react-hook-form's Controller would drive it. */
function Harness({ onChange, initial = '', ...props }: Partial<DatePickerProps> & { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <DatePicker
      label="Fecha"
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
beforeEach(() => {
  // "Today" is Tuesday 17 Nov 2026 (local time). Only Date is faked; timers stay real.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 17, 10, 30) })
})
afterEach(() => {
  vi.useRealTimers()
})

const trigger = () => screen.getByRole('button', { name: /^Fecha/ })
const day = (name: RegExp) => screen.getByRole('button', { name })
const calendarGone = () => waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument())

describe('date-utils', () => {
  it('formats and parses local dates without timezone shifts', () => {
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01')
    expect(parseISODate('2026-02-31')).toBeNull()
    expect(parseISODate('2026-12-31')?.getDate()).toBe(31)
    expect(toISODate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
  })
})

describe('DatePicker', () => {
  it('links the visible label and the error message to the trigger', () => {
    render(<Harness error="Indica la fecha." />)
    const button = trigger()
    expect(button).toHaveAttribute('aria-invalid', 'true')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAccessibleDescription('Indica la fecha.')
    expect(screen.getByText('Indica la fecha.')).toHaveClass('text-danger')
    expect(button).toHaveTextContent('Selecciona una fecha')
  })

  it('shows the value formatted in Spanish', () => {
    render(<Harness initial="2026-11-16" />)
    expect(trigger()).toHaveTextContent(/lun, 16 nov 2026/)
  })

  it('opens a Monday-first grid focused on the selected day, marking today', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-11-20" />)

    await user.click(trigger())
    const grid = screen.getByRole('grid', { name: 'Noviembre 2026' })
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    // The grid starts on Monday 26 Oct 2026.
    expect(grid.querySelector('button')).toHaveAttribute('data-date', '2026-10-26')

    const selected = day(/20 de noviembre de 2026/)
    expect(selected).toHaveFocus()
    expect(selected.closest('td')).toHaveAttribute('aria-selected', 'true')
    expect(selected).toHaveClass('bg-primary', 'text-primary-fg')
    expect(day(/17 de noviembre de 2026/)).toHaveAttribute('aria-current', 'date')
    expect(day(/17 de noviembre de 2026/).closest('td')).toHaveAttribute('aria-selected', 'false')
  })

  it('focuses today when empty and emits YYYY-MM-DD across a month boundary', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(trigger())
    expect(day(/17 de noviembre de 2026/)).toHaveFocus()

    await user.keyboard('{ArrowDown}{ArrowDown}') // 1 Dec
    expect(screen.getByRole('grid', { name: 'Diciembre 2026' })).toBeInTheDocument()
    expect(day(/, 1 de diciembre de 2026/)).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenLastCalledWith('2026-12-01')
    await calendarGone()
    expect(trigger()).toHaveFocus()
    expect(trigger()).toHaveTextContent(/1 dic 2026/)

    // And backwards across a year boundary.
    await user.keyboard('{ArrowDown}') // opens on 1 Dec
    await user.keyboard('{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}')
    expect(day(/, 1 de enero de 2026/)).toHaveFocus()
    await user.keyboard('{ArrowLeft}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('2025-12-31')
  })

  it('moves by day, week, month and to week start/end with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-11-18" />) // Wednesday

    await user.click(trigger())
    await user.keyboard('{Home}')
    expect(day(/lunes, 16 de noviembre/)).toHaveFocus()
    await user.keyboard('{End}')
    expect(day(/domingo, 22 de noviembre/)).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(day(/15 de noviembre/)).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(day(/16 de noviembre/)).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(day(/16 de diciembre/)).toHaveFocus()
    await user.keyboard('{Shift>}{PageDown}{/Shift}')
    expect(day(/16 de diciembre de 2027/)).toHaveFocus()
  })

  it('changes month with the header buttons', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-01-31" />)

    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByRole('grid', { name: 'Febrero 2026' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByRole('grid', { name: 'Diciembre 2025' })).toBeInTheDocument()
  })

  it('respects min: earlier days are disabled and cannot be selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} min="2026-11-17" />)

    await user.click(trigger())
    const before = day(/16 de noviembre de 2026/)
    expect(before).toHaveAttribute('aria-disabled', 'true')
    expect(day(/17 de noviembre de 2026/)).not.toHaveAttribute('aria-disabled')

    await user.click(before)
    await user.keyboard('{ArrowLeft}')
    expect(before).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('grid')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(onChange).toHaveBeenCalledWith('2026-11-17')
  })

  it('disables "Hoy" when today is before min and focuses min on open', async () => {
    const user = userEvent.setup()
    render(<Harness min="2026-12-05" />)

    await user.click(trigger())
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeDisabled()
    expect(day(/, 5 de diciembre de 2026/)).toHaveFocus()
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

    await user.click(trigger())
    parentKeyDown.mockClear()
    await user.keyboard('{Escape}')
    await calendarGone()
    expect(parentKeyDown).not.toHaveBeenCalled()
    expect(trigger()).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes on outside click and calls onBlur', async () => {
    const user = userEvent.setup()
    const onBlur = vi.fn()
    render(
      <>
        <Harness onBlur={onBlur} />
        <button type="button">Fuera</button>
      </>,
    )

    await user.click(trigger())
    expect(screen.getByRole('grid')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fuera' }))
    await calendarGone()
    expect(onBlur).toHaveBeenCalled()
  })

  it('does not open when disabled and forwards the ref to the trigger', async () => {
    const user = userEvent.setup()
    const ref = { current: null as HTMLButtonElement | null }
    render(<Harness disabled ref={ref} name="date" initial="2026-11-17" />)

    expect(ref.current).toBe(trigger())
    await user.click(trigger())
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(document.querySelector('input[type="hidden"][name="date"]')).toHaveValue('2026-11-17')
  })
})
