import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { ease } from '../lib/motion'

/**
 * Lenguaje de movimiento estándar (ADR-0008). Todo el sitio usa estas piezas,
 * nunca duraciones sueltas. MotionConfig reducedMotion="user" (App.tsx) las desactiva
 * si el sistema pide menos movimiento.
 */

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: ease } }

/** Contenedor que hace entrar a sus <StaggerItem> en cascada. */
export function Stagger({
  as = 'div',
  className,
  children,
}: {
  as?: 'div' | 'ul'
  className?: string
  children: ReactNode
}) {
  const Tag = as === 'ul' ? motion.ul : motion.div
  return (
    <Tag variants={list} initial="hidden" animate="show" className={className}>
      {children}
    </Tag>
  )
}

export function StaggerItem({
  as = 'div',
  className,
  children,
}: {
  as?: 'div' | 'li'
  className?: string
  children: ReactNode
}) {
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag variants={item} className={className}>
      {children}
    </Tag>
  )
}

/** Entrada simple (sube y aparece). */
export function FadeIn({
  delay = 0,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
