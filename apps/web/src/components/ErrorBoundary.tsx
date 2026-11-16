import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui'

/** Last resort: an unexpected render error shows a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main
        role="alert"
        className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <h1 className="text-2xl font-bold">Algo ha fallado</h1>
        <p className="text-muted-fg">No hemos podido mostrar esta pantalla. Tus reservas no se han modificado.</p>
        <Button onClick={() => window.location.assign('/')}>Volver al inicio</Button>
      </main>
    )
  }
}
