import { useMemo } from 'react'
import { analyzeDream } from '../lib/analyze'
import type { DreamReport, Lang } from '../types/dream'

/**
 * Pure derived analysis from dream text + language + variation.
 * Recomputes only when inputs change — no async side effects.
 */
export function useDreamAnalysis(
  dreamText: string,
  lang: Lang,
  variation: number,
  enabled: boolean,
): DreamReport | null {
  return useMemo(() => {
    if (!enabled || dreamText.trim().length < 8) return null
    return analyzeDream(dreamText, lang, variation)
  }, [dreamText, lang, variation, enabled])
}
