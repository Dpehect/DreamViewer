import { motion } from 'framer-motion'
import type { Lang } from '../lib/i18n'

export function LanguageSwitch({
  lang,
  onChange,
}: {
  lang: Lang
  onChange: (l: Lang) => void
}) {
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {(['en', 'tr'] as const).map((code) => {
        const active = lang === code
        return (
          <button
            key={code}
            type="button"
            className={`lang-btn${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(code)}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="lang-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="lang-label">{code.toUpperCase()}</span>
          </button>
        )
      })}
    </div>
  )
}
