import type { Transition } from 'motion/react'

/** Curvas estándar del sitio (ADR-0008). No usar duraciones sueltas. */
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }
export const ease: Transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
