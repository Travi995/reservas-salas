import type { ReactNode } from 'react'

/**
 * A page exactly as tall as the window (minus the header and, on mobile, the tab bar), so the page itself
 * never scrolls: its body is a flex column where one area (`flex-1 min-h-0`) scrolls inside and the rest stays put.
 * Below a minimum height it gives up and lets the page scroll, so nothing gets squeezed unusably.
 */
export function ViewportPage({ children }: { children: ReactNode }) {
  return <div className="flex h-[calc(100svh-12rem)] min-h-[30rem] flex-col sm:h-[calc(100svh-8.5rem)]">{children}</div>
}
