import { useEffect, type ReactNode } from 'react'

const APP_NAME = 'Reservas de salas'
const PAGE_HEADING_ID = 'page-heading'

/**
 * Moves keyboard and screen-reader focus to the page title. Use it when the control that had the focus
 * disappears (e.g. the «Cancelar reserva» button of a reservation that was just cancelled).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function focusPageHeading() {
  document.getElementById(PAGE_HEADING_ID)?.focus()
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  // Each screen names its browser tab (history, bookmarks and screen readers tell them apart).
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [title])

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {/* Focusable by script: after an action removes the focused control, focus lands here (see focusPageHeading). */}
        <h1 id={PAGE_HEADING_ID} tabIndex={-1} className="text-2xl font-bold tracking-tight focus:outline-none">
          {title}
        </h1>
        {description && <p className="mt-1 text-muted-fg">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
