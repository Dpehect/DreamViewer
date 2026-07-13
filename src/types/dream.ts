/** Shared domain types for DreamViewer AI */

export type Lang = 'en' | 'tr'

export type Phase = 'idle' | 'loading' | 'success' | 'error'

export type ImageSource = 'grok-imagine' | 'flux'

export type SymbolReading = {
  name: string
  meaning: string
}

/**
 * Full dream analysis report produced from user text.
 * All narrative fields are language-aware.
 */
export type DreamReport = {
  seed: number
  variation: number
  title: string
  mood: string
  tags: string[]
  /** Detailed prompt for Grok Imagine / Flux */
  imagePrompt: string
  /** One-line art direction under the image */
  imageNote: string
  emotionalAtmosphere: string
  symbols: SymbolReading[]
  psychology: string
  hiddenMessages: string
  personalAdvice: string
  reflectionQuestions: string[]
  thematicConnections: string
  /** 0 = soft · 1 = dramatic/epic */
  drama: number
}

export type ImagineResult = {
  url: string
  source: ImageSource
  prompt: string
}

export type DreamSession = {
  /** Original dream text that produced this session */
  dreamText: string
  variation: number
  report: DreamReport
  image: ImagineResult | null
}
