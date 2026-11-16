import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from './ui'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-muted hover:text-fg',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}
