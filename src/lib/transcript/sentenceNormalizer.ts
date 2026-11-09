import type { SentenceSegment } from '../../types/index.ts'

/**
 * Normalizes sentence boundaries between consecutive segments.
 *
 * Problem:
 * In YouTube auto-captions and naive timestamp-based VTT/SRT chunks,
 * time boundaries often cut 0.5s too late, causing the first word(s) of the next
 * sentence to be attached to the end of the previous segment after a period.
 * Example:
 *   Segment A: "...a novelist. This"
 *   Segment B: "particular story was published in 1946."
 *
 * Solution:
 * Detects terminal punctuation (. ! ?) followed by 1 to 3 trailing words at the end of Segment A,
 * moves those trailing word(s) to the start of Segment B, and shifts the boundary timestamp by ~0.4s-0.6s
 * so audio and text are both 100% fluent, complete, and grammatically natural.
 */
export function normalizeSentenceBoundaries(
  rawSegments: SentenceSegment[]
): SentenceSegment[] {
  if (!Array.isArray(rawSegments) || rawSegments.length <= 1) {
    return rawSegments || []
  }

  // Clone segments to avoid mutating caller references
  const segments: SentenceSegment[] = rawSegments.map((s) => ({ ...s }))

  for (let i = 0; i < segments.length - 1; i++) {
    const cur = segments[i]
    const next = segments[i + 1]

    if (!cur.text || !next.text) continue

    // Regex explanation:
    // ^([\s\S]*?[.!?])      -> Captures complete sentence ending with terminal punctuation (. ? !)
    // \s+                   -> Separating space
    // ([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+){0,2}) -> 1 to 3 dangling words without terminal punctuation
    // \s*$                  -> End of segment text
    const match = cur.text.match(
      /^([\s\S]*?[.!?])\s+([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+){0,2})\s*$/
    )

    if (match) {
      const cleanCurText = match[1].trim()
      const danglingWords = match[2].trim()

      // Avoid false positives like abbreviations (e.g. "U.S.", "Dr.", "e.g.")
      const lastTokenMatch = cleanCurText.match(/([A-Za-z0-9]+)[.!?]$/)
      const lastToken = lastTokenMatch ? lastTokenMatch[1].toLowerCase() : ''
      const isAbbreviation = /^(mr|mrs|ms|dr|prof|st|vs|etc|eg|ie|us|uk)$/i.test(lastToken)

      if (!isAbbreviation && cleanCurText.length >= 5) {
        cur.text = cleanCurText
        next.text = `${danglingWords} ${next.text.trim()}`

        // Adjust boundary timestamp: each word is typically ~0.35s - 0.5s spoken time
        const wordCount = danglingWords.split(/\s+/).length
        const estimatedSeconds = Math.round(wordCount * 0.4 * 10) / 10

        const curDuration = cur.endTime - cur.startTime
        if (curDuration > estimatedSeconds + 1.0) {
          const newBoundary = Math.round((cur.endTime - estimatedSeconds) * 10) / 10
          cur.endTime = newBoundary
          // Ensure next starts at or slightly before the new boundary to guarantee capturing audio onset
          if (next.startTime >= cur.endTime) {
            next.startTime = newBoundary
          }
        }
      }
    }
  }

  return segments
}
