import { useCallback, useState } from 'react'

export type ViewMode = 'cards' | 'table'

const STORAGE_KEY = 'reservas.view-mode'

function read(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'table' ? 'table' : 'cards'
  } catch {
    // Storage can be blocked (private window, site data off): fall back to cards.
    return 'cards'
  }
}

/** How listings are shown (cards or table). One preference for every listing, remembered in this browser. */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(read)
  const update = useCallback((next: ViewMode) => {
    setMode(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not persisted; the choice still applies until the page closes.
    }
  }, [])
  return [mode, update]
}
