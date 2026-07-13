import { memo } from 'react'
import { motion } from 'framer-motion'
import type { Lang } from '../types/dream'

type Props = {
  lang: Lang
  onChange: (l: Lang) => void
}

function LanguageSwitchInner({ lang, onChange }: Props) {
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

export const LanguageSwitch = memo(LanguageSwitchInner)
