import { motion } from 'framer-motion'
import type { DreamReport } from '../lib/analyze'
import type { UiCopy } from '../lib/i18n'

const EASE = [0.22, 1, 0.36, 1] as const

function Block({
  label,
  delay,
  children,
  lead,
}: {
  label: string
  delay: number
  children: React.ReactNode
  lead?: boolean
}) {
  return (
    <motion.section
      className="analysis-block"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ delay, duration: 0.55, ease: EASE }}
    >
      <h3 className="analysis-label">{label}</h3>
      <div className={lead ? 'analysis-body lead' : 'analysis-body'}>{children}</div>
    </motion.section>
  )
}

export function AnalysisPanel({
  report,
  t,
}: {
  report: DreamReport
  t: UiCopy
}) {
  return (
    <div className="analysis-panel">
      <h2 className="serif analysis-title">{t.analysisTitle}</h2>

      <Block label={t.sections.emotional} delay={0.04} lead>
        {report.emotionalAtmosphere}
      </Block>

      <Block label={t.sections.symbols} delay={0.08}>
        <ul className="symbol-list">
          {report.symbols.map((s) => (
            <li key={s.name}>
              <strong className="serif">{s.name}</strong>
              <p>{s.meaning}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block label={t.sections.psychology} delay={0.12}>
        {report.psychology}
      </Block>

      <Block label={t.sections.hidden} delay={0.16}>
        {report.hiddenMessages}
      </Block>

      <Block label={t.sections.advice} delay={0.2}>
        <p className="advice-text">{report.advice}</p>
        <p className="questions-heading">{t.questionsLabel}</p>
        <ul className="questions">
          {report.reflectionQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </Block>
    </div>
  )
}
