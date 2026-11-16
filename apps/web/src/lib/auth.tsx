import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api, setUnauthorizedHandler, tokenStore } from './api'
import type { AuthResponse, User } from './types'

interface AuthContextValue {
  user: User | null
  /** true while the stored token is being validated on app load. */
  checking: boolean
  /** The stored session could not be validated (offline, server down). The token is kept: retry, don't log out. */
  sessionError: string | null
  retrySession: () => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => tokenStore.get() !== null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setSessionError(null)
  }, [])

  /** Validates the stored token. `checking` is already true when this runs. */
  const validate = useCallback(() => {
    api
      .me()
      .then(setUser)
      // A 401 already logged us out (unauthorized handler). Anything else (network, 5xx) says nothing
      // about the token: keep it and let the user retry instead of sending them to the login page.
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) return
        setSessionError(
          e instanceof ApiError && e.status === 0
            ? e.message
            : 'No hemos podido comprobar tu sesión. Inténtalo de nuevo en unos segundos.',
        )
      })
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (tokenStore.get()) validate()
  }, [logout, validate])

  const retrySession = useCallback(() => {
    setChecking(true)
    setSessionError(null)
    validate()
  }, [validate])

  const start = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken)
    setUser(res.user)
    setSessionError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      checking,
      sessionError,
      retrySession,
      logout,
      login: async (email, password) => start(await api.login(email, password)),
      register: async (name, email, password) => start(await api.register(name, email, password)),
    }),
    [user, checking, sessionError, retrySession, logout, start],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
