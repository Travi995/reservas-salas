import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'

interface AsyncState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
}

/** Loads data and reloads it when the dependencies change. Deliberately minimal (ADR-0007). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    run()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (!active) return
        const apiError = error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Error inesperado.')
        setState({ data: null, error: apiError, loading: false })
      })
    return () => {
      active = false
    }
  }, [run, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  // If the last load failed (e.g. offline), retry by itself as soon as the connection is back.
  const failed = state.error !== null
  useEffect(() => {
    if (!failed) return
    window.addEventListener('online', reload)
    return () => window.removeEventListener('online', reload)
  }, [failed, reload])

  return { ...state, reload }
}
