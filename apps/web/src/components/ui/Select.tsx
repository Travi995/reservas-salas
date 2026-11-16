import { Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { ease } from '../../lib/motion'
import { cn } from './cn'
import { PANEL, TRIGGER, shouldOpenUp, useTriggerRef, useOutsidePointerDown } from './popover'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

export interface SelectProps {
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  error?: string
  hint?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  /** Option highlighted (and scrolled to) when opening with nothing selected, e.g. 09:00 in a long list of times. */
  initialValue?: string
  /** Compact variant: label to the left of a small trigger (e.g. «Por página» in a pagination bar). */
  inline?: boolean
  /** Forwarded to the trigger button (react-hook-form `field.ref`, so `shouldFocus` works). */
  ref?: Ref<HTMLButtonElement>
}

/** Max list height in px (matches `max-h-64`); used to decide whether to open upwards. */
const LIST_MAX_HEIGHT = 256
const TYPEAHEAD_RESET_MS = 500

/**
 * Custom select following the WAI-ARIA "select-only combobox" pattern: focus stays on the
 * trigger (role="combobox") and the active option is exposed via aria-activedescendant.
 * Controlled; plugs into react-hook-form through <Controller>.
 */
export function Select({
  label,
  options,
  value,
  onChange,
  onBlur,
  name,
  error,
  hint,
  disabled,
  placeholder = 'Selecciona una opción',
  className,
  inline,
  initialValue,
  ref,
}: SelectProps) {
  const id = useId()
  const labelId = `${id}-label`
  const listId = `${id}-list`
  const msgId = `${id}-msg`
  const optionId = (index: number) => `${id}-opt-${index}`

  const rootRef = useRef<HTMLDivElement>(null)
  const [triggerRef, setTriggerRef] = useTriggerRef(ref)
  const typeahead = useRef({ text: '', timer: 0 })
  const listRef = useRef<HTMLUListElement>(null)
  /** The first scroll after opening centres the active option; later ones (keyboard) only keep it in view. */
  const justOpened = useRef(false)

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [up, setUp] = useState(false)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const message = error ?? hint
  const invalid = Boolean(error)

  const openList = (index: number) => {
    if (disabled || options.length === 0) return
    setActive(Math.max(0, Math.min(index, options.length - 1)))
    justOpened.current = true
    setUp(shouldOpenUp(triggerRef.current, LIST_MAX_HEIGHT))
    setOpen(true)
  }

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false)
      if (returnFocus) triggerRef.current?.focus()
    },
    [triggerRef],
  )

  const closeFromOutside = useCallback(() => close(false), [close])
  useOutsidePointerDown(open, rootRef, closeFromOutside)

  const choose = (index: number) => {
    const option = options[index]
    if (option) onChange(option.value)
    close()
  }

  // Keeps the active option visible while navigating a long list.
  // Scrolls the list itself (never an ancestor: scrollIntoView would also scroll the dialog around it).
  useEffect(() => {
    const list = listRef.current
    const option = open ? document.getElementById(`${id}-opt-${active}`) : null
    if (!list || !option) return
    const top = option.offsetTop
    const bottom = top + option.offsetHeight
    if (justOpened.current) {
      list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2
      justOpened.current = false
    } else if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
  }, [open, active, id])

  const initialIndex = Math.max(
    0,
    options.findIndex((o) => o.value === initialValue),
  )

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), [])

  /** Type-ahead: finds the next option whose label starts with the typed text. */
  const matchTypeahead = (char: string, from: number) => {
    const state = typeahead.current
    window.clearTimeout(state.timer)
    state.text += char.toLocaleLowerCase('es')
    state.timer = window.setTimeout(() => (state.text = ''), TYPEAHEAD_RESET_MS)
    // Repeating the same letter cycles through the options that start with it.
    const allSame = [...state.text].every((c) => c === state.text[0])
    const search = allSame ? state.text[0] : state.text
    const start = allSame || state.text.length === 1 ? from + 1 : from
    for (let i = 0; i < options.length; i++) {
      const index = (start + i) % options.length
      if (options[index].label.toLocaleLowerCase('es').startsWith(search)) return index
    }
    return -1
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event
    const last = options.length - 1
    const isChar = key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) {
        event.preventDefault()
        openList(selectedIndex >= 0 ? selectedIndex : initialIndex)
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault()
        openList(key === 'Home' ? 0 : last)
      } else if (isChar) {
        const match = matchTypeahead(key, selectedIndex)
        if (match >= 0) openList(match)
      }
      return
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((i) => Math.min(i + 1, last))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (event.altKey) choose(active)
        else setActive((i) => Math.max(i - 1, 0))
        break
      case 'Home':
      case 'PageUp':
        event.preventDefault()
        setActive(key === 'Home' ? 0 : Math.max(active - 10, 0))
        break
      case 'End':
      case 'PageDown':
        event.preventDefault()
        setActive(key === 'End' ? last : Math.min(active + 10, last))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Escape':
        // Keeps a parent <dialog> open: only the listbox closes.
        event.preventDefault()
        event.stopPropagation()
        close()
        break
      case 'Tab':
        close(false)
        break
      default:
        if (isChar) {
          const match = matchTypeahead(key, active)
          if (match >= 0) setActive(match)
        }
    }
  }

  return (
    <div className={cn('flex min-w-0 gap-1.5', inline ? 'items-center gap-2' : 'flex-col', className)}>
      <span
        id={labelId}
        className={cn('text-sm', inline ? 'whitespace-nowrap text-muted-fg' : 'font-medium text-fg')}
        onClick={() => triggerRef.current?.focus()}
      >
        {label}
      </span>
      <div ref={rootRef} className={cn('relative min-w-0', inline && 'w-20')}>
        <button
          ref={setTriggerRef}
          type="button"
          role="combobox"
          disabled={disabled}
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? optionId(active) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? msgId : undefined}
          onClick={() => (open ? close() : openList(selectedIndex >= 0 ? selectedIndex : initialIndex))}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (rootRef.current?.contains(e.relatedTarget)) return
            setOpen(false)
            onBlur?.()
          }}
          className={cn(
            inline ? TRIGGER.replace('h-11', 'h-9').replace('px-3', 'px-2.5').replace('text-base', 'text-sm') : TRIGGER,
            invalid ? 'border-danger' : 'border-control',
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-muted-fg')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 shrink-0 text-muted-fg transition-transform duration-150', open && 'rotate-180')}
          />
        </button>
        {name !== undefined && <input type="hidden" name={name} value={value} />}

        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              tabIndex={-1}
              initial={{ opacity: 0, y: up ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: up ? 4 : -4, scale: 0.98 }}
              transition={ease}
              // Keeps focus on the trigger when clicking options or the scrollbar.
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                PANEL,
                'inset-x-0 max-h-64 overflow-y-auto overscroll-contain p-1',
                up ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top',
              )}
            >
              {options.map((option, index) => {
                const isSelected = index === selectedIndex
                return (
                  <li
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(index)}
                    onMouseMove={() => index !== active && setActive(index)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2',
                      inline ? 'min-h-9 text-sm' : 'min-h-11 text-base',
                      index === active && 'bg-muted',
                      isSelected && 'font-medium text-primary',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className="truncate text-sm font-normal text-muted-fg">{option.description}</span>
                      )}
                    </span>
                    <Check aria-hidden="true" className={cn('size-4 shrink-0', !isSelected && 'invisible')} />
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {message && (
        <p id={msgId} className={cn('text-sm', error ? 'text-danger' : 'text-muted-fg')}>
          {message}
        </p>
      )}
    </div>
  )
}
