import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeDream } from '../lib/analyze'
import { ImagineError, imagineDream } from '../lib/imagine'
import { detectDefaultLang, persistLang, ui } from '../lib/i18n'
import type {
  DreamSession,
  ImagineResult,
  Lang,
  Phase,
} from '../types/dream'

export type UseDreamReturn = {
  lang: Lang
  setLang: (l: Lang) => void
  dreamText: string
  setDreamText: (v: string) => void
  phase: Phase
  error: string | null
  session: DreamSession | null
  report: DreamSession['report'] | null
  image: ImagineResult | null
  imageReady: boolean
  setImageReady: (v: boolean) => void
  canSubmit: boolean
  isLoading: boolean
  weave: () => Promise<void>
  regenerate: () => Promise<void>
  reset: () => void
}

const MIN_LEN = 8

/**
 * Central dream session: text, phase machine, analysis, image gen.
 * - AbortController cancels in-flight requests
 * - runId guards against stale async completions
 * - Language switch re-analyzes without regenerating the image
 */
export function useDream(): UseDreamReturn {
  const [lang, setLangState] = useState<Lang>(detectDefaultLang)
  const [dreamText, setDreamText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<DreamSession | null>(null)
  const [imageReady, setImageReady] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)
  const langRef = useRef(lang)
  langRef.current = lang

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    persistLang(l)
  }, [])

  // Language change: re-run pure analysis, keep image
  useEffect(() => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        report: analyzeDream(prev.dreamText, lang, prev.variation),
      }
    })
  }, [lang])

  const runWeave = useCallback(async (text: string, variation: number) => {
    const trimmed = text.trim()
    if (trimmed.length < MIN_LEN) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const runId = ++runIdRef.current
    const activeLang = langRef.current
    const copy = ui[activeLang]

    setError(null)
    setPhase('loading')
    setImageReady(false)

    const report = analyzeDream(trimmed, activeLang, variation)
    setSession({
      dreamText: trimmed,
      variation,
      report,
      image: null,
    })

    try {
      const image = await imagineDream(
        report.imagePrompt,
        report.seed + variation,
        ac.signal,
      )
      if (runId !== runIdRef.current || ac.signal.aborted) return

      setSession({
        dreamText: trimmed,
        variation,
        report: analyzeDream(trimmed, langRef.current, variation),
        image,
      })
      setPhase('success')
    } catch (e) {
      if (runId !== runIdRef.current) return
      if (e instanceof ImagineError && e.code === 'aborted') return

      setError(
        e instanceof ImagineError && e.code === 'network'
          ? copy.errorNetwork
          : copy.errorGeneric,
      )
      setPhase('error')
      setSession((prev) => (prev?.image ? prev : null))
    }
  }, [])

  const weave = useCallback(async () => {
    await runWeave(dreamText, 0)
  }, [dreamText, runWeave])

  const regenerate = useCallback(async () => {
    const base = session?.dreamText ?? dreamText
    const nextVar = (session?.variation ?? 0) + 1
    await runWeave(base, nextVar)
  }, [session, dreamText, runWeave])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    runIdRef.current += 1
    setPhase('idle')
    setError(null)
    setSession(null)
    setDreamText('')
    setImageReady(false)
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    lang,
    setLang,
    dreamText,
    setDreamText,
    phase,
    error,
    session,
    report: session?.report ?? null,
    image: session?.image ?? null,
    imageReady,
    setImageReady,
    canSubmit: dreamText.trim().length >= MIN_LEN && phase !== 'loading',
    isLoading: phase === 'loading',
    weave,
    regenerate,
    reset,
  }
}
