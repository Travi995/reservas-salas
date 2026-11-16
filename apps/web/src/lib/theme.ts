import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'reservas.theme'

// Single theme store: shared by the sun/moon button and the Toaster.
const listeners = new Set<() => void>()
const media = () => matchMedia('(prefers-color-scheme: dark)')

function stored(): Theme | null {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

const current = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // With no saved choice, follow system changes.
  const onSystem = () => stored() === null && apply(media().matches ? 'dark' : 'light')
  const mq = media()
  mq.addEventListener('change', onSystem)
  return () => {
    listeners.delete(listener)
    mq.removeEventListener('change', onSystem)
  }
}

function toggle() {
  const next: Theme = current() === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* no storage: the change lasts for the session */
  }
  apply(next)
}

/** Light/dark theme. The initial value is set by the inline script in index.html. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current, () => 'light' as Theme)
  return { theme, toggle }
}
