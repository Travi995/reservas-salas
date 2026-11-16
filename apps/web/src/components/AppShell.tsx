import { CalendarDays, CalendarCheck, DoorOpen, LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { AnimatedBackground } from './AnimatedBackground'
import { ease, spring } from '../lib/motion'
import { ThemeToggle } from './ThemeToggle'
import { Logo, cn } from './ui'

const NAV = [
  { to: '/', label: 'Disponibilidad', icon: CalendarDays, admin: false },
  { to: '/mis-reservas', label: 'Mis reservas', icon: CalendarCheck, admin: false },
  { to: '/admin/salas', label: 'Salas', icon: DoorOpen, admin: true },
]

/** Header with navigation at ≥ sm; fixed bottom bar on mobile (ADR-0008). */
export function AppShell() {
  const { user, logout } = useAuth()
  const items = NAV.filter((item) => !item.admin || user?.role === 'admin')
  const { pathname } = useLocation()

  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <AnimatedBackground />
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" aria-label="Salas, inicio">
            <Logo />
          </NavLink>
          <nav aria-label="Principal" className="hidden flex-1 gap-1 sm:flex">
            {items.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-muted-fg hover:bg-muted hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        transition={spring}
                        className="absolute inset-0 -z-10 rounded-lg bg-primary-soft"
                      />
                    )}
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <div className="hidden min-w-0 text-right md:block">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-fg">{user?.role === 'admin' ? 'Administrador' : 'Miembro'}</p>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-muted hover:text-fg"
            >
              <LogOut aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pb-10">
        {/* Smooth transition when changing pages */}
        <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={ease}>
          <Outlet />
        </motion.div>
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="flex">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                    isActive ? 'text-primary' : 'text-muted-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="tab-bar-pill"
                        transition={spring}
                        className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                      />
                    )}
                    <Icon aria-hidden="true" className="size-5" />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
