import { CalendarCheck, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { AnimatedBackground } from '../../components/AnimatedBackground'
import { FadeIn, Stagger, StaggerItem } from '../../components/motion'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Card, Logo } from '../../components/ui'

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: 'Sin reuniones pisadas', text: 'Dos reservas nunca se solapan en la misma sala.' },
  { icon: Users, title: 'La sala justa', text: 'Filtra por capacidad y mira los huecos libres del día.' },
  { icon: ShieldCheck, title: 'Reglas claras', text: 'De 15 minutos a 4 horas, siempre en el futuro.' },
]

/**
 * Login/register layout.
 * - Top bar: logo on the left, theme on the right (same as the app).
 * - ≥ lg: two columns, brand message on the left and form on the right.
 * - < lg: only the form, compact, so it fits without scrolling.
 */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <AnimatedBackground />

      <header className="mx-auto flex h-14 w-full max-w-6xl shrink-0 sm:h-16 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pb-3 sm:px-6 sm:pb-6 lg:grid-cols-2 lg:pb-16">
        <section aria-label="Qué es Salas" className="hidden lg:block">
          <FadeIn>
            <h2 className="max-w-md text-4xl font-bold tracking-tight text-balance">
              Reserva la sala que necesitas <span className="text-primary">en segundos.</span>
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted-fg">
              Todas las salas de tus oficinas en un solo sitio, sin pisarte con nadie.
            </p>
          </FadeIn>
          <Stagger as="ul" className="mt-10 flex max-w-md flex-col gap-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <StaggerItem as="li" key={title} className="flex gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-fg">{text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <FadeIn delay={0.08} className="mx-auto w-full max-w-sm lg:mr-0">
          <Card className="shadow-xl shadow-primary/10 sm:p-6">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 mb-4 text-sm text-muted-fg sm:mb-5">{subtitle}</p>
            {children}
          </Card>
        </FadeIn>
      </main>
    </div>
  )
}
