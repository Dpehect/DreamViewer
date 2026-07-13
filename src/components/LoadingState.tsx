import { memo } from 'react'
import { motion } from 'framer-motion'

const DOTS = ['#f9a8d4', '#c4b5fd', '#93c5fd', '#6ee7b7', '#fdba74']

type Props = {
  title: string
  sub: string
}

function LoadingStateInner({ title, sub }: Props) {
  return (
    <motion.div
      className="loading"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
      transition={{ duration: 0.4 }}
    >
      <div className="loading-ring-wrap">
        <motion.div
          className="loading-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="loading-core"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      </div>
      <div className="dots">
        {DOTS.map((c, i) => (
          <motion.span
            key={c}
            style={{ background: c }}
            animate={{ y: [0, -10, 0], opacity: [0.35, 1, 0.35] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <p className="serif loading-title">{title}</p>
      <p className="loading-sub">{sub}</p>
    </motion.div>
  )
}

export const LoadingState = memo(LoadingStateInner)
