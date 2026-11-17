import type { SentenceSegment } from '../../types/index.ts'

const ABBREVIATIONS_REGEX = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S|U\.K)\.$/i
const TERMINAL_PUNCTUATION_REGEX = /[.!?…]["'”’)\]]*$/
const INTERNAL_BOUNDARY_REGEX = /([.!?…]["'”’)\]]*)\s+/g
const MAX_LOOKBACK_SEGMENTS = 3
const MAX_PREFIX_WORDS = 30

function endsWithCompleteSentence(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || !TERMINAL_PUNCTUATION_REGEX.test(trimmed)) {
    return false
  }
  const strippedQuotes = trimmed.replace(/["'”’)\]]+$/, '')
  return !ABBREVIATIONS_REGEX.test(strippedQuotes)
}

function extractTrailingIncompleteSentence(text: string): { tail: string; foundBoundary: boolean } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { tail: '', foundBoundary: false }
  }

  let lastSplitIndex = -1
  INTERNAL_BOUNDARY_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = INTERNAL_BOUNDARY_REGEX.exec(trimmed)) !== null) {
    const beforeBoundary = trimmed.slice(0, match.index + match[1].length).replace(/["'”’)\]]+$/, '')
    if (!ABBREVIATIONS_REGEX.test(beforeBoundary)) {
      lastSplitIndex = match.index + match[0].length
    }
  }

  if (lastSplitIndex !== -1 && lastSplitIndex < trimmed.length) {
    return { tail: trimmed.slice(lastSplitIndex).trim(), foundBoundary: true }
  }

  return { tail: trimmed, foundBoundary: false }
}

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

/**
 * When a transcript segment starts mid-sentence (because the preceding segment
 * did not end with sentence-ending punctuation), extracts the incomplete
 * preceding words so Show Answer / Check Answer and translation display a
 * complete, meaningful sentence—while dictation scoring stays strictly scoped
 * to the current segment.
 */
export function getBrokenSentencePrefix(
  sentences: SentenceSegment[],
  activeIndex: number
): string {
  if (!Array.isArray(sentences) || activeIndex <= 0 || activeIndex >= sentences.length) {
    return ''
  }

  const prevText = (sentences[activeIndex - 1]?.text || '').trim()
  if (!prevText || endsWithCompleteSentence(prevText)) {
    return ''
  }

  const collected: string[] = []
  let wordCount = 0
  const minIndex = Math.max(0, activeIndex - MAX_LOOKBACK_SEGMENTS)

  for (let i = activeIndex - 1; i >= minIndex; i--) {
    const segText = (sentences[i]?.text || '').trim()
    if (!segText) break

    // If an earlier segment ended a complete sentence cleanly, stop before it
    if (i < activeIndex - 1 && endsWithCompleteSentence(segText)) {
      break
    }

    const { tail, foundBoundary } = extractTrailingIncompleteSentence(segText)
    if (tail) {
      collected.unshift(tail)
      wordCount += tail.split(/\s+/).length
    }

    if (foundBoundary || wordCount >= MAX_PREFIX_WORDS) {
      break
    }
  }

  return collected.join(' ').trim()
}
