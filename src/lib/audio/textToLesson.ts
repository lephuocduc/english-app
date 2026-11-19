import type { Lesson, SentenceSegment, VoiceAccent } from '../../types'

const ABBREVIATIONS_REGEX = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S|U\.K)\.$/i
const DEFAULT_WORDS_PER_SECOND = 2.4

/**
 * Checks whether a lesson is a Text-to-Audio lesson (rather than a YouTube video lesson).
 * Uses both explicit sourceType and videoId prefix for seamless D1 round-trip compatibility.
 */
export function isAudioLesson(
  lesson?: { sourceType?: string; videoId?: string } | null
): boolean {
  if (!lesson) return false
  if (lesson.sourceType === 'audio') return true
  const vid = lesson.videoId || ''
  return vid.startsWith('audio-') || vid.startsWith('tts-')
}

/**
 * Estimates spoken duration in seconds for a single English sentence at ~144 WPM.
 */
export function estimateSentenceDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 2.0
  const rawSeconds = words / DEFAULT_WORDS_PER_SECOND + 0.45
  return Math.round(Math.max(2.0, rawSeconds) * 10) / 10
}

/**
 * Estimates total spoken audio duration in seconds for a block of text.
 */
export function estimateAudioDurationSeconds(rawText: string): number {
  const sentences = splitTextIntoSentences(rawText)
  if (sentences.length === 0) return 0
  return Math.round(
    sentences.reduce((sum, sentence) => sum + estimateSentenceDuration(sentence), 0)
  )
}

/**
 * Splits raw English prose or dialogue into natural sentence strings
 * while respecting abbreviations (Mr., Dr., U.S.) and decimal numbers.
 */
export function splitTextIntoSentences(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const results: string[] = []
  const paragraphs = normalized.split(/\n+/)

  for (const para of paragraphs) {
    const trimmedPara = para.trim().replace(/\s+/g, ' ')
    if (!trimmedPara) continue

    let start = 0
    const boundaryRegex = /([.!?…]["'”’)\]]*)\s+/g
    let match: RegExpExecArray | null

    while ((match = boundaryRegex.exec(trimmedPara)) !== null) {
      const candidateEnd = match.index + match[1].length
      const before = trimmedPara.slice(start, candidateEnd).replace(/["'”’)\]]+$/, '')
      if (ABBREVIATIONS_REGEX.test(before)) {
        continue
      }

      const chunk = trimmedPara.slice(start, candidateEnd).trim()
      if (chunk) {
        results.push(chunk)
      }
      start = match.index + match[0].length
    }

    const tail = trimmedPara.slice(start).trim()
    if (tail) {
      results.push(tail)
    }
  }

  return results
}

/**
 * Converts an array of plain English sentences into timestamped SentenceSegments.
 */
export function buildTimedSegmentsFromSentences(
  sentences: string[],
  idPrefix: string
): SentenceSegment[] {
  let cursor = 0
  return sentences
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, idx) => {
      const duration = estimateSentenceDuration(text)
      const startTime = Math.round(cursor * 10) / 10
      const endTime = Math.round((cursor + duration) * 10) / 10
      cursor = endTime
      return {
        id: `${idPrefix}-seg-${idx + 1}`,
        startTime,
        endTime,
        text,
      }
    })
}

export interface CreateAudioLessonOptions {
  title: string
  rawText: string
  level?: 'Beginner' | 'Intermediate' | 'Advanced'
  voiceAccent?: VoiceAccent
  description?: string
}

/**
 * Creates a complete Audio Lesson object ready to persist in LocalStorage & Cloudflare D1.
 */
export function createAudioLessonFromText({
  title,
  rawText,
  level = 'Intermediate',
  voiceAccent = 'en-GB',
  description,
}: CreateAudioLessonOptions): Lesson {
  const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  // Keep videoId <= 32 chars for Cloudflare D1 schema compatibility
  const audioId = `audio-${uniqueSuffix}`.slice(0, 32)
  const sentenceTexts = splitTextIntoSentences(rawText)
  const sentences = buildTimedSegmentsFromSentences(sentenceTexts, audioId)
  const wordCount = sentenceTexts.join(' ').split(/\s+/).filter(Boolean).length
  const durationSec = Math.round(
    sentences.length > 0 ? sentences[sentences.length - 1].endTime : 0
  )

  return {
    id: `lesson-${audioId}`,
    videoId: audioId,
    sourceType: 'audio',
    voiceAccent,
    title: title.trim() || 'Custom Audio Lesson',
    description:
      description?.trim() ||
      `Custom Text-to-Audio dictation (~${durationSec}s, ${wordCount} words).`,
    language: 'en',
    level,
    transcriptSource: 'Text-to-Audio (TTS)',
    isVerified: true,
    sentences,
  }
}
