import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fetchYouTubeVideoMetadata } from '../lib/youtube/videoMetadata'

describe('fetchYouTubeVideoMetadata', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns null for empty videoId', async () => {
    const res = await fetchYouTubeVideoMetadata('')
    expect(res).toBeNull()
  })

  it('returns title from noembed when successful', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: 'Steve Jobs 2005 Stanford Commencement Address',
        author_name: 'Stanford',
      }),
    } as any)

    const res = await fetchYouTubeVideoMetadata('UF8uR6Z6KLc')
    expect(res).toEqual({
      title: 'Steve Jobs 2005 Stanford Commencement Address',
      author: 'Stanford',
    })
  })

  it('falls back to youtube oembed if noembed fails', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error on noembed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Learn English With Friends',
          author_name: 'Learn English Lab',
        }),
      } as any)

    const res = await fetchYouTubeVideoMetadata('dQw4w9WgXcQ')
    expect(res).toEqual({
      title: 'Learn English With Friends',
      author: 'Learn English Lab',
    })
  })

  it('returns null if both services fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('All network requests failed'))

    const res = await fetchYouTubeVideoMetadata('invalid-id')
    expect(res).toBeNull()
  })
})
