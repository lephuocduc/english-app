import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(async (env) => {
  const command = env?.command || (process.env.NODE_ENV === 'production' ? 'build' : 'serve')
  const plugins: any[] = [react()]
  if (!process.env.VITEST) {
    const tailwind = (await import('@tailwindcss/vite')).default
    plugins.push(tailwind())

    // Dev server API handlers for YouTube transcripts & Text-to-Speech proxy
    plugins.push({
      name: 'listenflow-api-dev',
      configureServer(server: any) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (req.url && req.url.startsWith('/api/tts')) {
            const urlObj = new URL(req.url, 'http://127.0.0.1:5173')
            const text = (urlObj.searchParams.get('text') || '').trim()
            const lang = (urlObj.searchParams.get('lang') || 'en-US').trim()

            if (!text) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: 'Missing text query' }))
              return
            }

            try {
              const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text.slice(0, 190))}`
              const upstream = await fetch(ttsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
              })
              if (!upstream.ok) {
                res.statusCode = 502
                res.end('TTS upstream error')
                return
              }
              const buf = Buffer.from(await upstream.arrayBuffer())
              res.statusCode = 200
              res.setHeader('Content-Type', 'audio/mpeg')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(buf)
              return
            } catch (err: unknown) {
              res.statusCode = 500
              const msg = err instanceof Error ? err.message : 'TTS proxy error'
              res.end(JSON.stringify({ success: false, error: msg }))
              return
            }
          }

          if (req.url && req.url.startsWith('/api/transcript/')) {
            const urlObj = new URL(req.url, 'http://127.0.0.1:5173')
            const parts = urlObj.pathname.split('/')
            const videoId = parts[3]
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
          next()
        })
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
