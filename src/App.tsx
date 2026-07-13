import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AnalysisPanel } from './components/AnalysisPanel'
import { LanguageSwitch } from './components/LanguageSwitch'
import { analyzeDream, type DreamReport } from './lib/analyze'
import { imagineDream, type ImagineResult } from './lib/imagine'
import { ui, type Lang } from './lib/i18n'

type Phase = 'idle' | 'loading' | 'done'

const EASE = [0.22, 1, 0.36, 1] as const
const DOTS = ['#f6c1d4', '#c9b8e8', '#a8d4f0', '#b8e8d4', '#f5c9a8']

function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem('dw-lang')
      if (s === 'en' || s === 'tr') return s
    } catch {
      /* ignore */
    }
    return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  })

  const change = (l: Lang) => {
    setLang(l)
    try {
      localStorage.setItem('dw-lang', l)
    } catch {
      /* ignore */
    }
  }

  return [lang, change]
}

function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="orb orb-d" />
      <div className="orb orb-e" />
      <div className="grain" />
    </div>
  )
}

export default function App() {
  const [lang, setLang] = useLang()
  const t = ui[lang]

  const [dream, setDream] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [report, setReport] = useState<DreamReport | null>(null)
  const [image, setImage] = useState<ImagineResult | null>(null)
  const [imgReady, setImgReady] = useState(false)
  const [variation, setVariation] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [hintIdx, setHintIdx] = useState(0)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const id = window.setInterval(
      () => setHintIdx((i) => (i + 1) % t.examples.length),
      5200,
    )
    return () => clearInterval(id)
  }, [t.examples.length])

  // Refresh analysis copy when language changes mid-result
  useEffect(() => {
    if (phase === 'done' && dream.trim().length >= 8) {
      setReport(analyzeDream(dream, lang, variation))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const busy = phase === 'loading'
  const canSubmit = dream.trim().length >= 8 && !busy

  const weave = useCallback(
    async (text: string, nextVar: number) => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      setError(null)
      setPhase('loading')
      setImgReady(false)
      setImage(null)

      const analysis = analyzeDream(text, lang, nextVar)
      setReport(analysis)
      setVariation(nextVar)

      try {
        const img = await imagineDream(analysis.imagePrompt, analysis.seed + nextVar, ac.signal)
        if (ac.signal.aborted) return
        setImage(img)
        setPhase('done')
        window.setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setError(t.error)
        setPhase('idle')
      }
    },
    [lang, t.error],
  )

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSubmit) return
    void weave(dream, 0)
  }

  const again = () => {
    if (!dream.trim() || busy) return
    void weave(dream, variation + 1)
  }

  const reset = () => {
    abortRef.current?.abort()
    setPhase('idle')
    setReport(null)
    setImage(null)
    setDream('')
    setVariation(0)
    setError(null)
    setImgReady(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => taRef.current?.focus(), 280)
  }

  const charHint =
    dream.trim().length === 0
      ? t.charEmpty
      : dream.trim().length < 8
        ? t.charMore
        : `${dream.trim().length} ${t.charReady}`

  return (
    <div className="page">
      <Ambient />

      <header className="header">
        <div className="brand">
          <span className="brand-dot" />
          <span className="serif brand-name">{t.brand}</span>
          <span className="brand-tag">{t.tagline}</span>
        </div>
        <LanguageSwitch lang={lang} onChange={setLang} />
      </header>

      <main className={`main${phase === 'done' ? ' is-wide' : ''}`}>
        <section className="hero">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            {t.eyebrow}
          </motion.p>
          <motion.h1
            className="serif hero-title"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.8, ease: EASE }}
          >
            {t.heroTitle}
            <br />
            <em>{t.heroItalic}</em>
          </motion.h1>
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.7, ease: EASE }}
          >
            {t.heroSub}
          </motion.p>
        </section>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.75, ease: EASE }}
        >
          <label htmlFor="dream" className="sr-only">
            Dream
          </label>
          <div className="field">
            <textarea
              id="dream"
              ref={taRef}
              className="dream-input"
              rows={5}
              value={dream}
              disabled={busy}
              placeholder={t.examples[hintIdx] ?? t.placeholder}
              onChange={(e) => setDream(e.target.value)}
            />
          </div>
          <div className="meta-row">
            <p>{charHint}</p>
            {error && <p className="error">{error}</p>}
          </div>

          <div className="actions">
            <motion.button
              type="submit"
              className="cta"
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.02, y: -1 } : undefined}
              whileTap={canSubmit ? { scale: 0.985 } : undefined}
            >
              <AnimatePresence mode="wait" initial={false}>
                {busy ? (
                  <motion.span
                    key="load"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <motion.span
                      className="spinner"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    {t.ctaLoading}
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {t.cta}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {phase === 'idle' && dream.length === 0 && (
              <div className="hints">
                {t.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="hint"
                    onClick={() => {
                      setDream(ex)
                      taRef.current?.focus()
                    }}
                  >
                    {ex.slice(0, 42)}…
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="key-hint">{t.noKeyHint}</p>
        </motion.form>

        <AnimatePresence>
          {busy && (
            <motion.div
              className="loading"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="dots">
                {DOTS.map((c, i) => (
                  <motion.span
                    key={c}
                    style={{ background: c }}
                    animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
              <p className="serif loading-title">{t.loadingTitle}</p>
              <p className="loading-sub">{t.loadingSub}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <section ref={resultRef}>
          <AnimatePresence mode="wait">
            {phase === 'done' && report && (
              <motion.div
                key={`${report.seed}-${variation}-${lang}`}
                className="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="result-header">
                  <p className="eyebrow">{t.analysisTitle}</p>
                  <h2 className="serif result-title">{report.title}</h2>
                  <p className="result-mood">{report.mood}</p>
                  {report.tags.length > 0 && (
                    <p className="result-tags">{report.tags.slice(0, 6).join(' · ')}</p>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.75, ease: EASE }}
                >
                  <div className="image-frame">
                    {!imgReady && <div className="image-skeleton animate-pulse" />}
                    {image && (
                      <button type="button" onClick={() => setLightbox(true)}>
                        <motion.img
                          src={image.url}
                          alt={report.title}
                          referrerPolicy="no-referrer"
                          initial={false}
                          animate={{ opacity: imgReady ? 1 : 0 }}
                          transition={{ duration: 0.9, ease: EASE }}
                          onLoad={() => setImgReady(true)}
                        />
                      </button>
                    )}
                  </div>
                  <p className="image-caption">
                    {t.imageCaption}
                    {image && (
                      <span className="source-badge">
                        · {image.source === 'grok-imagine' ? 'Grok Imagine' : 'Flux'}
                      </span>
                    )}
                  </p>
                </motion.div>

                <AnalysisPanel report={report} t={t} />

                <p className="serif quote">
                  &ldquo;{dream.trim().slice(0, 160)}
                  {dream.trim().length > 160 ? '…' : ''}&rdquo;
                </p>

                <div className="result-actions">
                  <motion.button
                    type="button"
                    className="btn-ghost"
                    disabled={busy}
                    onClick={again}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t.again}
                  </motion.button>
                  <button type="button" className="text-link" onClick={reset}>
                    {t.newDream}
                  </button>
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
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <img src={image.url} alt={report?.title ?? ''} referrerPolicy="no-referrer" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
