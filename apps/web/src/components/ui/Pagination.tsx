import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageMeta } from '../../lib/types'
import { cn } from './cn'
import { pageWindow } from './page-window'

interface PaginationProps {
  meta: PageMeta
  onPageChange: (page: number) => void
  /** Disables the controls while the next page is loading. */
  disabled?: boolean
  className?: string
}

const BTN =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40'

/** Server-driven pagination: it only renders the `meta` the API sent and asks for another page. */
export function Pagination({ meta, onPageChange, disabled, className }: PaginationProps) {
  const { page, pageSize, totalItems, totalPages } = meta
  if (totalItems === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <nav
      aria-label="Paginación"
      className={cn('mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row', className)}
    >
      <p className="text-sm text-muted-fg tabular-nums" aria-live="polite">
        {from}–{to} de {totalItems}
      </p>
      {totalPages > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              className={cn(BTN, 'text-muted-fg hover:bg-muted hover:text-fg')}
              onClick={() => onPageChange(page - 1)}
              disabled={disabled || page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
          </li>
          {pageWindow(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted-fg">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  className={cn(
                    BTN,
                    p === page ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:bg-muted hover:text-fg',
                  )}
                  onClick={() => onPageChange(p)}
                  disabled={disabled}
                  aria-label={`Página ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              className={cn(BTN, 'text-muted-fg hover:bg-muted hover:text-fg')}
              onClick={() => onPageChange(page + 1)}
              disabled={disabled || page >= totalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </li>
        </ul>
      )}
    </nav>
  )
}
