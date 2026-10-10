import type { SentenceSegment } from '../../types/index.ts'

/**
 * Strips HTML/XML tags and decodes common HTML entities
 */
export function cleanTranscriptText(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Converts timestamp strings like "01:23.450", "01:23,450", "1:23", "01:23:45.670" to seconds (number).
 */
export function parseTimestampToSeconds(timeStr: string): number | null {
  const clean = timeStr.trim().replace(',', '.')
  // Format: HH:MM:SS.mmm or MM:SS.mmm or MM:SS
  const parts = clean.split(':').map((p) => parseFloat(p))
  if (parts.some((p) => isNaN(p))) return null

  if (parts.length === 3) {
    // HH:MM:SS
    return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 10) / 10
  }
  if (parts.length === 2) {
    // MM:SS
    return Math.round((parts[0] * 60 + parts[1]) * 10) / 10
  }
  if (parts.length === 1) {
    return Math.round(parts[0] * 10) / 10
  }
  return null
}

/**
 * Parses WebVTT or SubRip (.srt) subtitle text into SentenceSegment array.
 */
export function parseSrtOrVtt(content: string): SentenceSegment[] {
  const lines = content.split(/\r?\n/)
  const segments: SentenceSegment[] = []

  // Matches "00:00:01.000 --> 00:00:04.000" or "00:00:01,000 --> 00:00:04,000"
  // with optional hours
  const timeRegex = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/

  let currentStart: number | null = null
  let currentEnd: number | null = null
  let currentLines: string[] = []

  const timeToSec = (h: string | undefined, m: string, s: string, ms: string): number => {
    const hours = h ? parseInt(h, 10) : 0
    const minutes = parseInt(m, 10)
    const seconds = parseInt(s, 10)
    const millis = parseInt(ms.padEnd(3, '0').slice(0, 3), 10)
    return Math.round((hours * 3600 + minutes * 60 + seconds + millis / 1000) * 10) / 10
  }

  const flushSegment = () => {
    if (currentStart !== null && currentEnd !== null && currentLines.length > 0) {
      const combinedText = cleanTranscriptText(currentLines.join(' '))
      // Filter out empty lines or pure music annotations like [Music] / (Applause)
      if (
        combinedText &&
        !/^(\[|\()(music|applause|laughter|cheering|chuckle|giggle|sound)(\]|\))$/i.test(combinedText)
      ) {
        segments.push({
          id: `seg-${segments.length + 1}`,
          startTime: currentStart,
          endTime: currentEnd > currentStart ? currentEnd : Math.round((currentStart + 3) * 10) / 10,
          text: combinedText,
        })
      }
    }
    currentStart = null
    currentEnd = null
    currentLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(timeRegex)

    if (match) {
      flushSegment()
      currentStart = timeToSec(match[1], match[2], match[3], match[4])
      currentEnd = timeToSec(match[5], match[6], match[7], match[8])
      currentLines = []
      continue
    }

    // Skip WebVTT header or numeric cue indices
    if (
      trimmed.startsWith('WEBVTT') ||
      trimmed.startsWith('Kind:') ||
      trimmed.startsWith('Language:') ||
      /^\d+$/.test(trimmed)
    ) {
      continue
    }

    if (trimmed && currentStart !== null) {
      const cleaned = cleanTranscriptText(trimmed)
      if (cleaned && !currentLines.includes(cleaned)) {
        currentLines.push(cleaned)
      }
    }
  }

  flushSegment()
  return segments
}

/**
 * Parses transcript copied directly from YouTube's "Show transcript" panel.
 * Supported formats:
 * Format A:
 *   0:05
 *   Hello everyone
 *   0:09
 *   Welcome back
 * Format B:
 *   0:05 Hello everyone
 *   0:09 Welcome back
 */
export function parseYouTubeTranscriptPanel(content: string): SentenceSegment[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const segments: SentenceSegment[] = []

  // Regex for timestamp at beginning of line: e.g. "0:05", "12:34", "1:23:45"
  const singleLineRegex = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/
  const timestampOnlyRegex = /^((?:\d{1,2}:)?\d{1,2}:\d{2})$/

  let pendingTime: number | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check Format B (Timestamp and text on same line)
    const sameLineMatch = line.match(singleLineRegex)
    if (sameLineMatch) {
      const sec = parseTimestampToSeconds(sameLineMatch[1])
      const text = cleanTranscriptText(sameLineMatch[2])
      if (sec !== null && text) {
        segments.push({
          id: `seg-${segments.length + 1}`,
          startTime: sec,
          endTime: sec + 4.0, // Temporary default, will be adjusted below
          text,
        })
      }
      continue
    }

    // Check Format A (Timestamp on one line, text on next line)
    const timeOnlyMatch = line.match(timestampOnlyRegex)
    if (timeOnlyMatch) {
      pendingTime = parseTimestampToSeconds(timeOnlyMatch[1])
      continue
    }

    if (pendingTime !== null) {
      const text = cleanTranscriptText(line)
      if (text) {
        segments.push({
          id: `seg-${segments.length + 1}`,
          startTime: pendingTime,
          endTime: pendingTime + 4.0, // Temporary default
          text,
        })
      }
      pendingTime = null
    }
  }

  // Adjust endTimes based on next segment's startTime
  for (let i = 0; i < segments.length; i++) {
    const current = segments[i]
    const next = segments[i + 1]
    if (next && next.startTime > current.startTime) {
      current.endTime = Math.round(next.startTime * 10) / 10
    } else {
      current.endTime = Math.round((current.startTime + 4.0) * 10) / 10
    }
  }

  return segments
}

/**
 * Universal transcript parser that auto-detects format (SRT, WebVTT, YouTube panel, or raw text)
 */
export function parseUniversalTranscript(content: string): {
  success: boolean
  format: 'srt' | 'vtt' | 'youtube_panel' | 'raw_text' | 'empty'
  segments: SentenceSegment[]
  error?: string
} {
  const trimmed = content.trim()
  if (!trimmed) {
    return { success: false, format: 'empty', segments: [], error: 'Nội dung phụ đề trống.' }
  }

  // 1. Detect WebVTT
  if (trimmed.startsWith('WEBVTT') || /-->/.test(trimmed)) {
    const segments = parseSrtOrVtt(trimmed)
    if (segments.length > 0) {
      return { success: true, format: trimmed.startsWith('WEBVTT') ? 'vtt' : 'srt', segments }
    }
  }

  // 2. Detect YouTube transcript panel format
  const ytSegments = parseYouTubeTranscriptPanel(trimmed)
  if (ytSegments.length > 0) {
    return { success: true, format: 'youtube_panel', segments: ytSegments }
  }

  // 3. Fallback: Parse raw text by sentence boundaries (. ! ?)
  const rawSentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => cleanTranscriptText(s))
    .filter((s) => s.length > 2)

  if (rawSentences.length > 0) {
    const segments: SentenceSegment[] = rawSentences.map((text, idx) => ({
      id: `seg-${idx + 1}`,
      startTime: idx * 4,
      endTime: (idx + 1) * 4,
      text,
    }))
    return { success: true, format: 'raw_text', segments }
  }

  return {
    success: false,
    format: 'empty',
    segments: [],
    error: 'Không nhận diện được định dạng phụ đề hợp lệ.',
  }
}
