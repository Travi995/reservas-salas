import { RotateCw } from 'lucide-react'
import { Alert } from './Alert'
import { Button } from './Button'

/** A failed load with a way out: the message plus «Reintentar» (it also retries alone when back online). */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert className="items-center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{message}</span>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" className="size-4" /> Reintentar
        </Button>
      </div>
    </Alert>
  )
}
