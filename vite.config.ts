import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const ALLOWED_TTS_LANGS = new Set(['en', 'en-US', 'en-GB', 'en-AU'])

function splitForTtsChunks(text: string, maxLen = 180): string[] {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= maxLen) return [cleaned]

  const words = cleaned.split(' ')
  const chunks: string[] = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.length + 1 + word.length <= maxLen) {
      current += ` ${word}`
    } else {
      chunks.push(current)
      current = word
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function createListenFlowApiMiddleware() {
  return async (req: any, res: any, next: any) => {
    if (req.url) {
      const urlObj = new URL(req.url, 'http://127.0.0.1:5173')

      if (urlObj.pathname.endsWith('/api/tts')) {
        const text = (urlObj.searchParams.get('text') || '').trim()
        const rawLang = (urlObj.searchParams.get('lang') || 'en-GB').trim()
        const lang = ALLOWED_TTS_LANGS.has(rawLang) ? rawLang : 'en-GB'

        if (!text) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Missing text query' }))
          return
        }

        try {
          const chunks = splitForTtsChunks(text.slice(0, 500), 180)
          const buffers: Buffer[] = []

          for (const chunk of chunks) {
            const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunk)}`
            const upstream = await fetch(ttsUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            })
            if (!upstream.ok) {
              res.statusCode = 502
              res.end('TTS upstream error')
              return
            }
            buffers.push(Buffer.from(await upstream.arrayBuffer()))
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Cache-Control', 'public, max-age=86400')
          res.end(Buffer.concat(buffers))
          return
        } catch (err: unknown) {
          res.statusCode = 500
          const msg = err instanceof Error ? err.message : 'TTS proxy error'
          res.end(JSON.stringify({ success: false, error: msg }))
          return
        }
      }

      if (urlObj.pathname.includes('/api/transcript/')) {
        const videoId = urlObj.pathname.split('/api/transcript/')[1]?.split('/')[0] || ''
        const lang = urlObj.searchParams.get('lang') || 'en'

        try {
          const { fetchYouTubeSubtitles } = await import('./src/lib/transcript/youtubeSubtitleFetcher.ts')
          const result = await fetchYouTubeSubtitles(videoId, lang)
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = result.success ? 200 : 404
          res.end(JSON.stringify(result))
          return
        } catch (err: unknown) {
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 500
          const msg = err instanceof Error ? err.message : 'Unknown dev server error'
          res.end(JSON.stringify({ success: false, error: msg }))
          return
        }
      }
    }
    next()
  }
}

// https://vite.dev/config/
export default defineConfig(async (env) => {
  const command = env?.command || (process.env.NODE_ENV === 'production' ? 'build' : 'serve')
  const plugins: any[] = [react()]
  if (!process.env.VITEST) {
    const tailwind = (await import('@tailwindcss/vite')).default
    plugins.push(tailwind())

    // Dev & Preview server API handlers for YouTube transcripts & Text-to-Speech proxy
    plugins.push({
      name: 'listenflow-api-dev',
      configureServer(server: any) {
        server.middlewares.use(createListenFlowApiMiddleware())
      },
      configurePreviewServer(server: any) {
        server.middlewares.use(createListenFlowApiMiddleware())
      },
    })
  }

  return {
    base: process.env.VITE_BASE || (command === 'build' ? '/english-app/' : '/'),
    plugins,
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
