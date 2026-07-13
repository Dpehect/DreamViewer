/**
 * Image generation: Grok Imagine (server) → Flux fallback (Pollinations)
 */

export type ImagineResult = {
  url: string
  source: 'grok-imagine' | 'flux'
  prompt: string
}

export async function imagineDream(
  prompt: string,
  seed: number,
  signal?: AbortSignal,
): Promise<ImagineResult> {
  try {
    const res = await fetch('/api/imagine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal,
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
    }
  } catch {
    // fall through to Flux
  }

  return fluxFallback(prompt, seed)
}

/** Public Flux-compatible endpoint when no XAI_API_KEY */
function fluxFallback(prompt: string, seed: number): ImagineResult {
  const clipped = prompt.length > 1100 ? prompt.slice(0, 1100) : prompt
  const q = encodeURIComponent(clipped)
  const s = Math.abs(seed) % 2147483647
  const url =
    `https://image.pollinations.ai/prompt/${q}` +
    `?width=1440&height=1440&nologo=true&enhance=true&seed=${s}&model=flux`
  return { url, source: 'flux', prompt }
}
