import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode, ThHTMLAttributes } from 'react'
import type { SortState } from '../../lib/sort'
import { cn } from './cn'

/** Card-like frame for a table: rounded, bordered, and scrolling sideways inside itself on narrow screens. */
export function TableFrame({ children, label, busy }: { children: ReactNode; label: string; busy?: boolean }) {
  return (
    <div
      className={cn(
        'flex max-h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-opacity',
        busy && 'opacity-60',
      )}
    >
      <div className="relative min-h-0 overflow-auto">
        <table aria-label={label} aria-busy={busy} className="w-full min-w-[40rem] border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    </div>
  )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 bg-muted px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-muted-fg uppercase',
        className,
      )}
      {...props}
    />
  )
}

/** Column header that sorts the table: the classic up/down arrows, highlighted on the active column. */
export function SortTh<K extends string>({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string
  field: K
  sort: SortState<K> | null
  onSort: (field: K) => void
  className?: string
}) {
  const active = sort?.by === field
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <Th className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        title={`Ordenar por ${label.toLowerCase()}`}
        className={cn(
          'group -mx-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 tracking-wide uppercase transition-colors duration-150 hover:bg-surface hover:text-fg',
          active && 'text-fg',
        )}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn('size-3.5 shrink-0', active ? 'text-primary' : 'opacity-40 group-hover:opacity-100')}
        />
      </button>
    </Th>
  )
}

export function Tr({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <tr className={cn('border-t border-border transition-colors duration-150 hover:bg-muted/50', className)}>
      {children}
    </tr>
  )
}

export function Td({ className, children }: { className?: string; children?: ReactNode }) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>
}
