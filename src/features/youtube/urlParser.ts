import type { YouTubeUrlParseResult } from '../../types'

// YouTube video IDs are strictly 11 characters of [a-zA-Z0-9_-]
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

/**
 * Parses and validates YouTube URLs across all common formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 *
 * Handles query parameters (&t=, &list=, &feature=), trailing slashes,
 * and standardizes the output.
 */
export function parseYouTubeUrl(input: string): YouTubeUrlParseResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: 'Vui lòng dán đường link YouTube hợp lệ.',
    }
  }

  const trimmed = input.trim()

  // If user pasted just a raw 11-char video ID
  if (VIDEO_ID_REGEX.test(trimmed)) {
    return {
      isValid: true,
      videoId: trimmed,
      normalizedUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    }
  }

  // Ensure URL protocol for URL parser
  let urlString = trimmed
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(urlString)
  } catch {
    return {
      isValid: false,
      error: 'Địa chỉ URL không hợp lệ hoặc sai định dạng.',
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase()
  const pathname = parsedUrl.pathname
  const searchParams = parsedUrl.searchParams

  const isYouTubeHost =
    hostname === 'youtube.com' ||
    hostname === 'www.youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'music.youtube.com' ||
    hostname === 'youtu.be'

  if (!isYouTubeHost) {
    return {
      isValid: false,
      error: 'Đường link không phải từ YouTube (chỉ hỗ trợ youtube.com hoặc youtu.be).',
    }
  }

  let extractedId: string | null = null

  // Format 1: youtu.be/VIDEO_ID
  if (hostname === 'youtu.be') {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length > 0) {
      extractedId = parts[0]
    }
  }
  // Format 2: youtube.com/watch?v=VIDEO_ID
  else if (pathname === '/watch' || pathname === '/watch/') {
    extractedId = searchParams.get('v')
  }
  // Format 3: youtube.com/shorts/VIDEO_ID
  else if (pathname.startsWith('/shorts/')) {
    const parts = pathname.replace('/shorts/', '').split('/').filter(Boolean)
    if (parts.length > 0) {
      extractedId = parts[0]
    }
  }
  // Format 4: youtube.com/embed/VIDEO_ID
  else if (pathname.startsWith('/embed/')) {
    const parts = pathname.replace('/embed/', '').split('/').filter(Boolean)
    if (parts.length > 0) {
      extractedId = parts[0]
    }
  }
  // Format 5: youtube.com/live/VIDEO_ID
  else if (pathname.startsWith('/live/')) {
    const parts = pathname.replace('/live/', '').split('/').filter(Boolean)
    if (parts.length > 0) {
      extractedId = parts[0]
    }
  }

  if (!extractedId || !VIDEO_ID_REGEX.test(extractedId)) {
    return {
      isValid: false,
      error: 'Không tìm thấy mã video (Video ID 11 ký tự) hợp lệ trong đường link.',
    }
  }

  return {
    isValid: true,
    videoId: extractedId,
    normalizedUrl: `https://www.youtube.com/watch?v=${extractedId}`,
  }
}
