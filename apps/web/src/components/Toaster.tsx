import type { CSSProperties } from 'react'
import { Toaster as Sonner } from 'sonner'
import { useTheme } from '../lib/theme'

/** Global toaster (mounted once in App), on the right of the screen. Colors come from the design system tokens. */
export function Toaster() {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      duration={6000}
      containerAriaLabel="Avisos"
      visibleToasts={3}
      offset={16}
      mobileOffset={12}
      toastOptions={{
        className: 'font-sans',
        closeButtonAriaLabel: 'Cerrar aviso',
        style: { borderRadius: '0.75rem' },
      }}
      style={
        {
          '--normal-bg': 'var(--surface)',
          '--normal-text': 'var(--fg)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--success-soft)',
          '--success-text': 'var(--success)',
          '--success-border': 'color-mix(in srgb, var(--success) 30%, transparent)',
          '--error-bg': 'var(--danger-soft)',
          '--error-text': 'var(--danger)',
          '--error-border': 'color-mix(in srgb, var(--danger) 30%, transparent)',
          '--info-bg': 'var(--info-soft)',
          '--info-text': 'var(--info)',
          '--info-border': 'color-mix(in srgb, var(--info) 30%, transparent)',
        } as CSSProperties
      }
    />
  )
}
