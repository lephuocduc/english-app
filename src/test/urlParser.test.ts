import { describe, expect, it } from 'vitest'
import { parseYouTubeUrl } from '../features/youtube/urlParser'

describe('YouTube URL Parser', () => {
  const TEST_ID = 'UF8uR6Z6KLc'

  it('parses standard watch URL: youtube.com/watch?v=VIDEO_ID', () => {
    const result = parseYouTubeUrl(`https://www.youtube.com/watch?v=${TEST_ID}`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses standard watch URL with extra parameters (timestamp, list, t)', () => {
    const result = parseYouTubeUrl(`https://www.youtube.com/watch?v=${TEST_ID}&t=45s&feature=shared`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses shortened URL: youtu.be/VIDEO_ID', () => {
    const result = parseYouTubeUrl(`https://youtu.be/${TEST_ID}`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses shortened URL with timestamp: youtu.be/VIDEO_ID?t=10', () => {
    const result = parseYouTubeUrl(`https://youtu.be/${TEST_ID}?t=10`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses Shorts URL: youtube.com/shorts/VIDEO_ID', () => {
    const result = parseYouTubeUrl(`https://www.youtube.com/shorts/${TEST_ID}`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses Embed URL: youtube.com/embed/VIDEO_ID', () => {
    const result = parseYouTubeUrl(`https://www.youtube.com/embed/${TEST_ID}`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses Live URL: youtube.com/live/VIDEO_ID', () => {
    const result = parseYouTubeUrl(`https://www.youtube.com/live/${TEST_ID}`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses raw 11-char video ID directly', () => {
    const result = parseYouTubeUrl(TEST_ID)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('parses URL without protocol prefix (e.g. youtu.be/VIDEO_ID)', () => {
    const result = parseYouTubeUrl(`youtu.be/${TEST_ID}`)
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe(TEST_ID)
  })

  it('rejects empty or whitespace string', () => {
    const result = parseYouTubeUrl('   ')
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects non-YouTube domain (e.g., Vimeo, Facebook, Google)', () => {
    const result = parseYouTubeUrl('https://vimeo.com/12345678')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('not from YouTube')
  })

  it('rejects invalid or too short video ID in YouTube link', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=too_short')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('11-character')
  })

  it('rejects invalid URL characters / malformed input', () => {
    const result = parseYouTubeUrl('random text that is not a url or id')
    expect(result.isValid).toBe(false)
  })
})
