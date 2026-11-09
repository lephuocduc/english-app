import type { SentenceSegment } from '../../types/index.ts'

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'vs', 'etc', 'eg', 'ie',
  'us', 'uk', 'inc', 'ltd', 'co', 'jr', 'sr', 'approx', 'dept', 'est',
  'govt', 'corp', 'u.s', 'u.k', 'e.g', 'i.e'
])

// Trailing prepositions and particles that cannot naturally end a standalone sentence/listening chunk
const UNFINISHED_TRAILING_WORDS = new Set([
  'for', 'to', 'with', 'in', 'on', 'at', 'of', 'by', 'into', 'about', 'than',
  'the', 'a', 'an', 'that', 'which', 'who', 'whose', 'whom', 'as', 'whether',
  'from', 'under', 'over', 'between', 'through'
])

function isTerminalToken(word: string): boolean {
  if (!word) return false
  const match = word.match(/([a-zA-Z0-9]+)([.!?:;]+)$/)
  if (!match) return false
  const token = match[1].toLowerCase()
  const punct = match[2]
  if (ABBREVIATIONS.has(token)) return false
  if (/^[a-zA-Z]$/.test(token) && punct === '.') return false
  return /[.!?]/.test(punct)
}

/**
 * Normalizes sentence boundaries between consecutive segments.
 *
 * Eliminates transcript fragmentation common in YouTube captions and VTT/SRT cues:
 * 1. Step 1 (Trailing Words): Moves dangling words after terminal punctuation in Segment A to Segment B
 *    (e.g. "...a novelist. This" -> "...a novelist." and "This particular story...").
 * 2. Step 2 (Head Remnants): Pulls back unfinished remnants from Segment B that complete Segment A's sentence
 *    (e.g. A: "...kind of", B: "of fresh and new. So I'm gonna..." -> A: "...kind of of fresh and new.", B: "So I'm gonna...").
 * 3. Step 3 (Dangling Prepositions): Merges segments ending with prepositions ('for', 'to', 'with', 'in') into the next segment
 *    so sentences are never cut off mid-thought.
 */
export function normalizeSentenceBoundaries(
  rawSegments: SentenceSegment[]
): SentenceSegment[] {
  if (!Array.isArray(rawSegments) || rawSegments.length <= 1) {
    return rawSegments || []
  }

  // Clone segments to avoid mutating caller references
  let segments: SentenceSegment[] = rawSegments.map((s) => ({ ...s }))

  // Step 1: If Segment A ends with terminal punctuation followed by 1-3 dangling words
  for (let i = 0; i < segments.length - 1; i++) {
    const cur = segments[i]
    const next = segments[i + 1]
    if (!cur.text || !next.text) continue

    const tailMatch = cur.text.match(
      /^([\s\S]*?[.!?])\s+([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+){0,2})\s*$/
    )

    if (tailMatch) {
      const cleanCurText = tailMatch[1].trim()
      const danglingWords = tailMatch[2].trim()

      const lastTokenMatch = cleanCurText.match(/([A-Za-z0-9]+)[.!?]$/)
      const lastToken = lastTokenMatch ? lastTokenMatch[1].toLowerCase() : ''

      if (!ABBREVIATIONS.has(lastToken) && cleanCurText.length >= 5) {
        cur.text = cleanCurText
        next.text = `${danglingWords} ${next.text.trim()}`

        // Adjust boundary timestamp: each word is typically ~0.35s - 0.5s spoken time
        const wordCount = danglingWords.split(/\s+/).length
        const estimatedSeconds = Math.round(wordCount * 0.4 * 10) / 10

        const curDuration = cur.endTime - cur.startTime
        if (curDuration > estimatedSeconds + 0.8) {
          const newBoundary = Math.round((cur.endTime - estimatedSeconds) * 10) / 10
          cur.endTime = newBoundary
          next.startTime = newBoundary
        }
      }
    }
  }

  // Step 2: If Segment B starts with the head remnant of Segment A's sentence
  // (e.g. A has no terminal punctuation, B starts with "...of fresh and new. So I'm gonna start...")
  for (let i = 0; i < segments.length - 1; i++) {
    const cur = segments[i]
    const next = segments[i + 1]
    if (!cur.text || !next.text) continue

    const curEndsWithTerm = /[.!?]$/.test(cur.text.trim())
    if (!curEndsWithTerm) {
      // Look for first terminal punctuation in next followed by a Capitalized word or sentence start
      const headMatch = next.text.match(/^([^.!?]*?[.!?])\s+([A-Z].*)$/)
      if (headMatch) {
        const headRemnant = headMatch[1].trim()
        const nextRest = headMatch[2].trim()

        const tokens = headRemnant.split(/\s+/)
        const lastTok = tokens[tokens.length - 1]
        if (isTerminalToken(lastTok)) {
          cur.text = `${cur.text.trim()} ${headRemnant}`
          next.text = nextRest

          // Adjust boundary timestamp proportionally
          const remnantWords = tokens.length
          const nextDuration = next.endTime - next.startTime
          const totalNextWords = next.text.split(/\s+/).length + remnantWords
          const shiftSec = Math.round(((remnantWords / totalNextWords) * nextDuration) * 10) / 10

          const newBoundary = Math.min(
            next.endTime - 0.5,
            Math.round((cur.endTime + shiftSec) * 10) / 10
          )
          cur.endTime = newBoundary
          next.startTime = newBoundary
        }
      }
    }
  }

  // Step 3: If Segment A ends abruptly with an unfinished preposition ('for', 'to', 'with', 'in', etc.)
  // without terminal punctuation, merge into next segment so audio and text don't stop mid-thought
  const mergedSegments: SentenceSegment[] = []
  for (let i = 0; i < segments.length; i++) {
    const cur = segments[i]
    if (i < segments.length - 1) {
      const curWords = cur.text.trim().split(/\s+/)
      const lastWord = curWords[curWords.length - 1].toLowerCase().replace(/[^a-z]/g, '')
      const curEndsWithTerm = /[.!?]$/.test(cur.text.trim())

      if (!curEndsWithTerm && UNFINISHED_TRAILING_WORDS.has(lastWord)) {
        const next = segments[i + 1]
        next.text = `${cur.text.trim()} ${next.text.trim()}`
        next.startTime = cur.startTime
        continue // merge into next segment
      }
    }
    mergedSegments.push(cur)
  }

  return mergedSegments.map((s, idx) => ({
    ...s,
    id: `seg-${idx + 1}`,
  }))
}
