import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center">
      <Icon aria-hidden="true" className="size-8 text-muted-fg" />
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-fg">{children}</div>}
    </div>
  )
}
