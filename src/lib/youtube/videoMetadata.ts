/**
 * Utility to fetch YouTube video metadata (official title, author/channel)
 * Uses public CORS-friendly oEmbed / noembed endpoints without requiring an API key.
 */
export async function fetchYouTubeVideoMetadata(videoId: string): Promise<{
  title?: string
  author?: string
} | null> {
  if (!videoId || !videoId.trim()) return null

  const cleanId = videoId.trim()
  const watchUrl = `https://www.youtube.com/watch?v=${cleanId}`

  // 1. Try noembed.com (Fast, public CORS proxy for oEmbed)
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.title && typeof data.title === 'string' && data.title.trim()) {
        return {
          title: data.title.trim(),
          author: typeof data.author_name === 'string' ? data.author_name.trim() : undefined,
        }
      }
    }
  } catch {
    // Continue to official oEmbed
  }

  // 2. Try official YouTube oEmbed API
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.title && typeof data.title === 'string' && data.title.trim()) {
        return {
          title: data.title.trim(),
          author: typeof data.author_name === 'string' ? data.author_name.trim() : undefined,
        }
      }
    }
  } catch {
    // Both failed
  }

  return null
}
