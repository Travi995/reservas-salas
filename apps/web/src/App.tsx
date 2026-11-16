import { MotionConfig } from 'motion/react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/Toaster'
import { GuestOnly, RequireAdmin, RequireAuth } from './components/guards'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { AvailabilityPage } from './features/availability/AvailabilityPage'
import { WeekCalendarPage } from './features/calendar/WeekCalendarPage'
import { AdminReservationsPage } from './features/reservations/AdminReservationsPage'
import { MyReservationsPage } from './features/reservations/MyReservationsPage'
import { RoomsAdminPage } from './features/rooms/RoomsAdminPage'
import { AuthProvider } from './lib/auth'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<AvailabilityPage />} />
                  <Route path="/calendario" element={<WeekCalendarPage />} />
                  <Route path="/mis-reservas" element={<MyReservationsPage />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="/admin/salas" element={<RoomsAdminPage />} />
                    <Route path="/admin/reservas" element={<AdminReservationsPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </ErrorBoundary>
    </MotionConfig>
  )
}
