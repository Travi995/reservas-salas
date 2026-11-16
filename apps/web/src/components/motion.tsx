import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { ease } from '../lib/motion'

/**
 * Standard motion language (ADR-0008). The whole site uses these pieces,
 * never ad-hoc durations. MotionConfig reducedMotion="user" (App.tsx) disables them
 * when the system requests reduced motion.
 */

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: ease } }

/** Container that brings in its <StaggerItem> children in a staggered cascade. */
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

/** Simple entrance (slides up and fades in). */
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
