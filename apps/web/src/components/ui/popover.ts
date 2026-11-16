import { useCallback, useEffect, useRef, type Ref, type RefObject } from 'react'

/** Shared trigger styles: same 44px control as InputField (Field.tsx). */
export const TRIGGER =
  'flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border bg-surface px-3 text-left text-base text-fg transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

/** Shared floating panel styles (rendered in place, not portaled: works inside an open <dialog>). */
export const PANEL = 'absolute z-50 rounded-lg border border-border bg-surface text-fg shadow-lg'

/** Calls `onOutside` on a pointerdown outside `rootRef` while `open`. */
export function useOutsidePointerDown(open: boolean, rootRef: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (event: PointerEvent) => {
      const root = rootRef.current
      if (root && event.target instanceof Node && !root.contains(event.target)) onOutside()
    }
    document.addEventListener('pointerdown', handler, true)
    return () => document.removeEventListener('pointerdown', handler, true)
  }, [open, rootRef, onOutside])
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node)
  else if (ref) ref.current = node
}

/**
 * Internal ref for the trigger, merged with an external one (React 19 `ref` prop,
 * e.g. react-hook-form's field.ref). Returns [internalRef, callbackRefToAttach].
 */
export function useTriggerRef<T>(external: Ref<T> | undefined) {
  const internal = useRef<T | null>(null)
  const setRef = useCallback(
    (node: T | null) => {
      internal.current = node
      assignRef(external, node)
    },
    [external],
  )
  return [internal, setRef] as const
}

/** Visible vertical bounds for a popover: the viewport, narrowed by the nearest clipping ancestor (e.g. a scrolling <dialog>). */
function visibleBounds(el: HTMLElement): { top: number; bottom: number } {
  let top = 0
  let bottom = window.innerHeight
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY !== 'visible') {
      const rect = node.getBoundingClientRect()
      top = Math.max(top, rect.top)
      bottom = Math.min(bottom, rect.bottom)
      break
    }
  }
  return { top, bottom }
}

/**
 * Whether the panel should open upwards: only when it does not fit below but fits entirely above,
 * within the viewport and the nearest clipping container. Otherwise it opens downwards, where a
 * scrolling container can still reveal it (opening upwards into a clipped area would hide it).
 */
export function shouldOpenUp(trigger: HTMLElement | null, panelHeight: number): boolean {
  if (!trigger) return false
  const rect = trigger.getBoundingClientRect()
  const bounds = visibleBounds(trigger)
  const needed = panelHeight + 8
  const below = bounds.bottom - rect.bottom
  const above = rect.top - bounds.top
  return below < needed && above >= needed
}
