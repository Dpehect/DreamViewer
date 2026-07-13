import { memo } from 'react'
import { motion } from 'framer-motion'
import type { ImagineResult } from '../types/dream'

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  image: ImagineResult | null
  alt: string
  caption: string
  ready: boolean
  onReady: () => void
  onOpen: () => void
}

function ImageFrameInner({ image, alt, caption, ready, onReady, onOpen }: Props) {
  return (
    <motion.div
      className="image-wrap"
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div className="image-halo" />
      <div className="image-frame">
        {!ready && <div className="image-skeleton" aria-hidden />}
        {image && (
          <button type="button" onClick={onOpen} aria-label={alt}>
            <motion.img
              src={image.url}
              alt={alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              initial={false}
              animate={{
                opacity: ready ? 1 : 0,
                scale: ready ? 1 : 1.04,
                filter: ready ? 'blur(0px)' : 'blur(12px)',
              }}
              transition={{ duration: 0.95, ease: EASE }}
              onLoad={onReady}
            />
          </button>
        )}
      </div>
      <p className="image-caption">
        {caption}
        {image && (
          <span className="source-badge">
            {' '}
            · {image.source === 'grok-imagine' ? 'Grok Imagine' : 'Flux'}
          </span>
        )}
      </p>
    </motion.div>
  )
}

export const ImageFrame = memo(ImageFrameInner)
