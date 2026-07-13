import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

/**
 * POST /api/imagine
 * Body: { prompt: string }
 * Uses xAI Grok Imagine when XAI_API_KEY is set.
 */
function grokImaginePlugin(apiKey: string | undefined): Plugin {
  async function callXai(prompt: string, model: string) {
    const r = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        response_format: 'url',
      }),
    })
    return r
  }

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    try {
      const body = (await readJson(req)) as { prompt?: string }
      const prompt = body.prompt?.trim()
      if (!prompt) {
        sendJson(res, 400, { error: 'prompt required' })
        return
      }

      if (!apiKey) {
        sendJson(res, 200, { url: null, source: null, reason: 'no_api_key' })
        return
      }

      // Prefer quality model; fall back to standard Grok Imagine
      let response = await callXai(prompt, 'grok-imagine-image-quality')
      if (!response.ok) {
        const err1 = await response.text()
        console.warn('[grok-imagine] quality model failed, retrying standard', response.status, err1)
        response = await callXai(prompt, 'grok-imagine-image')
      }

      if (!response.ok) {
        const errText = await response.text()
        console.error('[grok-imagine] error', response.status, errText)
        sendJson(res, 502, { error: 'Grok Imagine request failed', detail: errText })
        return
      }

      const data = (await response.json()) as {
        data?: { url?: string; b64_json?: string }[]
      }
      const first = data.data?.[0]
      let url = first?.url
      if (!url && first?.b64_json) {
        url = `data:image/png;base64,${first.b64_json}`
      }
      if (!url) {
        sendJson(res, 502, { error: 'No image in Grok Imagine response' })
        return
      }

      sendJson(res, 200, { url, source: 'grok-imagine' })
    } catch (e) {
      console.error('[grok-imagine]', e)
      sendJson(res, 500, { error: 'imagine failed' })
    }
  }

  const mount = (middlewares: {
    use: (
      path: string,
      fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void,
    ) => void
  }) => {
    middlewares.use('/api/imagine', (req, res, next) => {
      if (req.method === 'GET') {
        next()
        return
      }
      void handler(req, res)
    })
  }

  return {
    name: 'grok-imagine-api',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.XAI_API_KEY || process.env.XAI_API_KEY

  return {
    plugins: [react(), tailwindcss(), grokImaginePlugin(apiKey)],
    server: { port: 5173 },
  }
})
