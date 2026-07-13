import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AmbientBackground } from './components/AmbientBackground'
import { AnalysisPanel } from './components/AnalysisPanel'
import { DreamComposer } from './components/DreamComposer'
import { ImageFrame } from './components/ImageFrame'
import { LanguageSwitch } from './components/LanguageSwitch'
import { LoadingState } from './components/LoadingState'
import { useDream } from './hooks/useDream'
import { ui } from './lib/i18n'

const EASE = [0.22, 1, 0.36, 1] as const
const SPRING = { type: 'spring' as const, stiffness: 340, damping: 30 }

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 + i * 0.06, duration: 0.55, ease: EASE },
  }),
}

export default function App() {
  const {
    lang,
    setLang,
    dreamText,
    setDreamText,
    phase,
    error,
    session,
    report,
    image,
    imageReady,
    setImageReady,
    canSubmit,
    isLoading,
    weave,
    regenerate,
    reset,
  } = useDream()

  const t = ui[lang]
  const resultRef = useRef<HTMLElement | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [hintIdx, setHintIdx] = useState(0)

  const hasResult = phase === 'success' && !!report

  useEffect(() => {
    const id = window.setInterval(
      () => setHintIdx((i) => (i + 1) % t.examples.length),
      5200,
    )
    return () => clearInterval(id)
  }, [t.examples.length])

  useEffect(() => {
    if (phase === 'success' && image) {
      const tmr = window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => window.clearTimeout(tmr)
    }
  }, [phase, image])

  const onReset = () => {
    reset()
    setLightbox(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page">
      <AmbientBackground />

      <motion.header
        className="header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="brand">
          <motion.span
            className="brand-dot"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="serif brand-name">
            Dream<span className="brand-accent">Viewer</span>
          </span>
          <span className="brand-tag">{t.tagline}</span>
        </div>
        <LanguageSwitch lang={lang} onChange={setLang} />
      </motion.header>

      <main className={`main${hasResult ? ' is-wide' : ''}`}>
        {/* Hero — collapses when results are open */}
        <section className={`hero${hasResult ? ' is-compact' : ''}`}>
          <motion.div
            className="hero-badge"
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <span className="hero-badge-dot" />
            {t.eyebrow}
          </motion.div>

          <motion.h1
            className="serif hero-title"
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            {t.heroTitle}{' '}
            <em className="hero-italic">{t.heroItalic}</em>
          </motion.h1>

          {!hasResult && (
            <>
              <motion.p
                className="hero-sub"
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                {t.heroSub}
              </motion.p>
              <motion.div
                className="hero-pills"
                initial="hidden"
                animate="show"
                variants={{
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.28 } },
                }}
              >
                {(lang === 'tr'
                  ? ['Grok Imagine', 'Derin analiz', 'Pastel sanat']
                  : ['Grok Imagine', 'Deep analysis', 'Pastel art']
                ).map((label) => (
                  <motion.span
                    key={label}
                    className="hero-pill"
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    {label}
                  </motion.span>
                ))}
              </motion.div>
            </>
          )}
        </section>

        <DreamComposer
          t={t}
          value={dreamText}
          onChange={setDreamText}
          onSubmit={() => void weave()}
          canSubmit={canSubmit}
          isLoading={isLoading}
          error={error}
          hintIndex={hintIdx}
        />

        <AnimatePresence>
          {isLoading && <LoadingState title={t.loadingTitle} sub={t.loadingSub} />}
        </AnimatePresence>

        <section ref={resultRef}>
          <AnimatePresence mode="wait">
            {hasResult && report && (
              <motion.div
                key={`${report.seed}-${report.variation}-${lang}`}
                className="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="result-header">
                  <p className="eyebrow">{t.analysisTitle}</p>
                  <h2 className="serif result-title">{report.title}</h2>
                  <p className="result-mood">{report.mood}</p>
                  {report.tags.length > 0 && (
                    <div className="result-tags">
                      {report.tags.slice(0, 6).map((tag) => (
                        <span key={tag} className="result-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Image + analysis side-by-side on desktop */}
                <div className="result-grid">
                  <ImageFrame
                    key={image?.url ?? String(report.seed)}
                    image={image}
                    alt={report.title}
                    caption={`${t.imageCaption}${report.imageNote ? ` · ${report.imageNote}` : ''}`}
                    ready={imageReady}
                    onReady={() => setImageReady(true)}
                    onOpen={() => setLightbox(true)}
                  />
                  <AnalysisPanel report={report} t={t} />
                </div>

                <blockquote className="serif quote">
                  &ldquo;{(session?.dreamText ?? dreamText).trim().slice(0, 160)}
                  {(session?.dreamText ?? dreamText).trim().length > 160 ? '…' : ''}&rdquo;
                </blockquote>

                <div className="result-actions">
                  <motion.button
                    type="button"
                    className="btn-ghost"
                    disabled={isLoading}
                    onClick={() => void regenerate()}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                  >
                    {t.again}
                  </motion.button>
                  <motion.button
                    type="button"
                    className="text-link"
                    onClick={onReset}
                    whileHover={{ scale: 1.02 }}
                  >
                    {t.newDream}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <footer className="footer">{t.footer}</footer>
      </main>

      <AnimatePresence>
        {lightbox && image && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="lightbox-bg"
              aria-label="Close"
              onClick={() => setLightbox(false)}
            />
            <motion.div
              className="lightbox-panel"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={SPRING}
            >
              <img
                src={image.url}
                alt={report?.title ?? ''}
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
