import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { PageLoader } from './ui'

/** Solo usuarios autenticados. Recuerda a dónde iba para volver tras el login. */
export function RequireAuth() {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <PageLoader label="Comprobando sesión…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Solo admin. El backend es quien protege de verdad (403); esto solo evita la pantalla. */
export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

/** Login/registro: si ya hay sesión, a la app. */
export function GuestOnly() {
  const { user, checking } = useAuth()
  if (checking) return <PageLoader label="Comprobando sesión…" />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
