import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#f9a8d4', '#c4b5fd', '#93c5fd', '#6ee7b7', '#fdba74']

function AmbientBackgroundInner() {
  const particles = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        id: i,
        left: `${(i * 31 + 5) % 96}%`,
        top: `${(i * 47 + 3) % 94}%`,
        size: 2 + (i % 4),
        delay: (i % 10) * 0.4,
        duration: 4.5 + (i % 6) * 0.6,
        color: COLORS[i % COLORS.length],
      })),
    [],
  )

  return (
    <div className="ambient" aria-hidden>
      <div className="ambient-base" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="orb orb-d" />
      <div className="orb orb-e" />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${6 + p.size * 2}px ${p.color}`,
          }}
          animate={{
            y: [0, -16 - (p.id % 6), 0],
            opacity: [0.15, 0.8, 0.15],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="grain" />
    </div>
  )
}

export const AmbientBackground = memo(AmbientBackgroundInner)
