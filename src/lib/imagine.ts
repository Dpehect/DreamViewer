/**
 * Image generation client
 * 1) POST /api/imagine → Grok Imagine (server-side XAI_API_KEY)
 * 2) Pollinations Flux fallback
 */

import type { ImagineResult } from '../types/dream'

const TIMEOUT_MS = 90_000
const MAX_RETRIES = 2

export type ImagineErrorCode = 'network' | 'server' | 'aborted' | 'unknown'

export class ImagineError extends Error {
  readonly code: ImagineErrorCode

  constructor(message: string, code: ImagineErrorCode = 'unknown') {
    super(message)
    this.name = 'ImagineError'
    this.code = code
  }
}

/**
 * Generate a single dream image.
 * Respects AbortSignal; retries transient failures on the server path.
 */
export async function imagineDream(
  prompt: string,
  seed: number,
  signal?: AbortSignal,
): Promise<ImagineResult> {
  if (signal?.aborted) {
    throw new ImagineError('Aborted', 'aborted')
  }

  const serverResult = await tryGrokImagine(prompt, signal)
  if (serverResult) return serverResult

  // Fallback always succeeds with a URL (client-side image host)
  return fluxFallback(prompt, seed)
}

async function tryGrokImagine(
  prompt: string,
  outerSignal?: AbortSignal,
): Promise<ImagineResult | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (outerSignal?.aborted) {
      throw new ImagineError('Aborted', 'aborted')
    }

    const controller = new AbortController()
    const onAbort = () => controller.abort()
    outerSignal?.addEventListener('abort', onAbort)

    const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('/api/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      })

      if (res.ok) {
        const data = (await res.json()) as {
          url?: string | null
          source?: string
          reason?: string
        }
        if (data.url) {
          return {
            url: data.url,
            source: 'grok-imagine',
            prompt,
          }
        }
        // no_api_key or empty → fall through to flux
        return null
      }

      // 5xx: retry; 4xx: stop
      if (res.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(400 * (attempt + 1), outerSignal)
        continue
      }
      return null
    } catch (e) {
      if (outerSignal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
        if (outerSignal?.aborted) throw new ImagineError('Aborted', 'aborted')
        // timeout — retry or give up to flux
        if (attempt < MAX_RETRIES) {
          await sleep(400 * (attempt + 1), outerSignal)
          continue
        }
        return null
      }
      if (attempt < MAX_RETRIES) {
        await sleep(400 * (attempt + 1), outerSignal)
        continue
      }
      return null
    } finally {
      window.clearTimeout(timeout)
      outerSignal?.removeEventListener('abort', onAbort)
    }
  }
  return null
}

function fluxFallback(prompt: string, seed: number): ImagineResult {
  const clipped = prompt.length > 1100 ? prompt.slice(0, 1100) : prompt
  const q = encodeURIComponent(clipped)
  const s = Math.abs(seed) % 2147483647
  const url =
    `https://image.pollinations.ai/prompt/${q}` +
    `?width=1440&height=1440&nologo=true&enhance=true&seed=${s}&model=flux`
  return { url, source: 'flux', prompt }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ImagineError('Aborted', 'aborted'))
      return
    }
    const id = window.setTimeout(resolve, ms)
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new ImagineError('Aborted', 'aborted'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
