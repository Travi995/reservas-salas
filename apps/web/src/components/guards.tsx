import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { notify } from '../lib/notify'
import { Button, ErrorState, PageLoader } from './ui'

/** The session check failed for a reason other than "invalid token": offer to retry, keep the session. */
function SessionUnavailable() {
  const { sessionError, retrySession, logout } = useAuth()
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 p-6">
      <ErrorState message={sessionError!} onRetry={retrySession} />
      <Button variant="ghost" size="sm" onClick={logout} className="self-center">
        Cerrar sesión
      </Button>
    </main>
  )
}

/** Authenticated users only. Remembers where they were going to return there after login. */
export function RequireAuth() {
  const { user, checking, sessionError } = useAuth()
  const location = useLocation()
  if (checking) return <PageLoader label="Comprobando sesión…" />
  if (sessionError) return <SessionUnavailable />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Admin only. The backend is the real protection (403); this just avoids showing the screen. */
export function RequireAdmin() {
  const { user } = useAuth()
  const allowed = user?.role === 'admin'
  useEffect(() => {
    if (!allowed) notify.info('Esa sección es solo para administradores.')
  }, [allowed])
  if (!allowed) return <Navigate to="/" replace />
  return <Outlet />
}

/** Login/register: if there is already a session, go to the app. */
export function GuestOnly() {
  const { user, checking, sessionError } = useAuth()
  if (checking) return <PageLoader label="Comprobando sesión…" />
  if (sessionError) return <SessionUnavailable />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
