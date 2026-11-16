import { motion } from 'motion/react'

const BLOBS = [
  { className: '-top-40 -left-32 size-[26rem] bg-glow-1', x: [0, 80, -20], y: [0, 60, 20], duration: 22 },
  { className: '-right-32 -bottom-48 size-[30rem] bg-glow-2', x: [0, -70, 10], y: [0, -50, 10], duration: 26 },
  { className: 'top-1/3 right-1/4 size-72 bg-primary/10', x: [0, -60, 40], y: [0, 40, -30], duration: 30 },
]

/**
 * Fondo estándar de todo el sitio: halos verde/azul que se desplazan despacio
 * sobre la trama de puntos del body. Fijo detrás del contenido, sin interacción.
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${b.className}`}
          animate={{ x: b.x, y: b.y, scale: [1, 1.12, 1] }}
          transition={{ duration: b.duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
