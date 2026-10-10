import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(async () => {
  const plugins: any[] = [react()]
  if (!process.env.VITEST) {
    const tailwind = (await import('@tailwindcss/vite')).default
    plugins.push(tailwind())

    // Dev server API handler for YouTube transcripts
    plugins.push({
      name: 'listenflow-api-dev',
      configureServer(server: any) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
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
    plugins,
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
