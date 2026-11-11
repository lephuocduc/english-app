import type { SentenceSegment } from '../../types/index.ts'

/**
 * Retains original transcript sentence segments faithfully as provided
 * by the transcript source (YouTube subtitles, SRT, WebVTT) without artificial
 * boundary splitting or word shifting.
 */
export function normalizeSentenceBoundaries(
  rawSegments: SentenceSegment[]
): SentenceSegment[] {
  if (!Array.isArray(rawSegments)) {
    return []
  }
  return rawSegments.map((s) => ({ ...s }))
}
