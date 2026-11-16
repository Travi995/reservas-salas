import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { PageLoader } from './ui'

/** Authenticated users only. Remembers where they were going to return there after login. */
export function RequireAuth() {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <PageLoader label="Comprobando sesión…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Admin only. The backend is the real protection (403); this just avoids showing the screen. */
export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

/** Login/register: if there is already a session, go to the app. */
export function GuestOnly() {
  const { user, checking } = useAuth()
  if (checking) return <PageLoader label="Comprobando sesión…" />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
