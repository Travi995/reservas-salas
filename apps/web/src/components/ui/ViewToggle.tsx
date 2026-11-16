import { LayoutGrid, Table2 } from 'lucide-react'
import type { ViewMode } from '../../lib/useViewMode'
import { cn } from './cn'

const OPTIONS = [
  { id: 'cards', label: 'Tarjetas', icon: LayoutGrid },
  { id: 'table', label: 'Tabla', icon: Table2 },
] as const

/** Segmented control to pick how a listing is shown. */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="Modo de vista" className="inline-flex rounded-lg bg-muted p-1">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          aria-label={`Ver como ${label.toLowerCase()}`}
          title={`Ver como ${label.toLowerCase()}`}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors duration-150',
            value === id ? 'bg-surface text-fg shadow-sm' : 'text-muted-fg hover:text-fg',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className="hidden min-[400px]:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
