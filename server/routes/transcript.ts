import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { fetchYouTubeSubtitles } from '../../src/lib/transcript/youtubeSubtitleFetcher'

export { fetchYouTubeSubtitles }

export const transcriptRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

/**
 * Route: GET /api/transcript/:videoId
 * Fetches and returns YouTube captions
 */
transcriptRouter.get('/:videoId', async (c) => {
  const videoId = c.req.param('videoId')
  const lang = c.req.query('lang') || 'en'

  const result = await fetchYouTubeSubtitles(videoId, lang)
  if (!result.success) {
    return c.json(result, 404)
  }

  return c.json(result)
})
