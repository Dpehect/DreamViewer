import { memo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { UiCopy } from '../lib/i18n'

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 }

type Props = {
  t: UiCopy
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  canSubmit: boolean
  isLoading: boolean
  error: string | null
  hintIndex: number
}

function DreamComposerInner({
  t,
  value,
  onChange,
  onSubmit,
  canSubmit,
  isLoading,
  error,
  hintIndex,
}: Props) {
  const [focused, setFocused] = useState(false)
  const progress = Math.min(1, value.trim().length / 8)

  const charHint =
    value.trim().length === 0
      ? t.charEmpty
      : value.trim().length < 8
        ? t.charMore
        : `${value.trim().length} ${t.charReady}`

  return (
    <motion.form
      className="compose"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onSubmit()
      }}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className={`compose-card${focused ? ' is-focused' : ''}`}
        animate={{
          boxShadow: focused
            ? '0 20px 56px rgba(196,181,253,0.25), 0 0 0 1px rgba(249,168,212,0.45)'
            : '0 12px 40px rgba(196,181,253,0.12), 0 0 0 1px rgba(255,255,255,0.7)',
        }}
      >
        <div className="compose-glow" />
        <label htmlFor="dream" className="compose-label">
          {t.inputLabel}
        </label>
        <textarea
          id="dream"
          className="dream-input"
          rows={4}
          value={value}
          disabled={isLoading}
          placeholder={t.examples[hintIndex] ?? t.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <div className="compose-footer">
          <div className="progress-track" aria-hidden>
            <motion.div
              className="progress-fill"
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            />
          </div>
          <div className="meta-row">
            <p>{charHint}</p>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      </motion.div>

      <div className="actions">
        <motion.button
          type="submit"
          className="cta"
          disabled={!canSubmit}
          whileHover={
            canSubmit
              ? { scale: 1.04, y: -3, boxShadow: '0 18px 48px rgba(196,181,253,0.5)' }
              : undefined
          }
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          transition={SPRING}
        >
          <span className="cta-shine" />
          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.span
                key="load"
                className="cta-inner"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <motion.span
                  className="spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
                />
                {t.ctaLoading}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                className="cta-inner"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {t.cta}
                <span className="cta-spark">✦</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {!isLoading && value.length === 0 && (
          <div className="hints">
            {t.examples.map((ex) => (
              <motion.button
                key={ex}
                type="button"
                className="hint"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChange(ex)}
              >
                {ex.slice(0, 44)}…
              </motion.button>
            ))}
          </div>
        )}
      </div>
      <p className="key-hint">{t.noKeyHint}</p>
    </motion.form>
  )
}

export const DreamComposer = memo(DreamComposerInner)
