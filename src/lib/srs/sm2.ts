import type { VocabularyItem, SRSRating } from '../../types'

export const DEFAULT_EASE_FACTOR = 2.5
export const MIN_EASE_FACTOR = 1.3

export interface SRSReviewResult {
  interval: number
  easeFactor: number
  repetitions: number
  dueDate: string
  lastReviewedAt: string
  mastered: boolean
}

export interface SRSStats {
  total: number
  due: number
  newWords: number
  learning: number
  mastered: number
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Add days to a date and return YYYY-MM-DD
 */
export function addDays(date: Date, days: number): string {
  const target = new Date(date)
  target.setDate(target.getDate() + Math.max(0, days))
  return formatDate(target)
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm adapted for Anki-style 4-point rating
 * 1: Again (Quên / Chưa nhớ)
 * 2: Hard (Khó nhớ)
 * 3: Good (Nhớ chuẩn)
 * 4: Easy (Rất dễ / Thuộc làu)
 */
export function calculateNextReview(
  item: VocabularyItem,
  rating: SRSRating,
  now: Date = new Date()
): SRSReviewResult {
  const prevReps = item.repetitions ?? 0
  const prevInterval = item.interval ?? 0
  const prevEase = item.easeFactor ?? DEFAULT_EASE_FACTOR
  const wasMastered = item.mastered ?? false

  let newReps: number
  let newInterval: number
  let newEase = prevEase
  let newMastered = wasMastered

  switch (rating) {
    case 1: {
      // Again: card failed, reset reps and review again today
      newReps = 0
      newInterval = 0
      newEase = Math.max(MIN_EASE_FACTOR, prevEase - 0.2)
      newMastered = false
      break
    }
    case 2: {
      // Hard: successful recall with effort — gentle growth, slightly lowers ease
      newReps = prevReps + 1
      if (prevInterval <= 1) {
        newInterval = 1
      } else {
        newInterval = Math.max(prevInterval, Math.round(prevInterval * 1.2))
      }
      newEase = Math.max(MIN_EASE_FACTOR, prevEase - 0.15)
      newMastered = false
      break
    }
    case 3: {
      // Good: standard successful recall (always strictly progresses when reps >= 3)
      newReps = prevReps + 1
      if (newReps === 1) {
        newInterval = 1
      } else if (newReps === 2) {
        newInterval = 3
      } else {
        newInterval = Math.max(prevInterval + 1, Math.round(prevInterval * prevEase))
      }
      // Require both long-term retention (>= 30 days) and consistent reviews (>= 5 reps)
      if (newInterval >= 30 && newReps >= 5) {
        newMastered = true
      }
      break
    }
    case 4: {
      // Easy: effortless recall — larger jump (always strictly > Good) & higher ease
      newReps = prevReps + 1
      if (newReps === 1) {
        newInterval = 4
      } else if (newReps === 2) {
        newInterval = 7
      } else {
        const goodInterval = Math.max(prevInterval + 1, Math.round(prevInterval * prevEase))
        newInterval = Math.max(goodInterval + 1, Math.round(prevInterval * prevEase * 1.3))
      }
      newEase = prevEase + 0.15
      if (newInterval >= 30 && newReps >= 4) {
        newMastered = true
      }
      break
    }
  }

  // Cap ease factor to reasonable upper bound (3.0)
  newEase = Math.min(3.0, Math.round(newEase * 100) / 100)

  return {
    interval: newInterval,
    easeFactor: newEase,
    repetitions: newReps,
    dueDate: addDays(now, newInterval),
    lastReviewedAt: now.toISOString(),
    mastered: newMastered,
  }
}

/**
 * Returns human-friendly interval preview for the Anki review button
 */
export function getIntervalPreviewText(
  item: VocabularyItem,
  rating: SRSRating,
  now: Date = new Date()
): string {
  const result = calculateNextReview(item, rating, now)
  if (result.interval === 0) return 'Today'
  if (result.interval === 1) return '1 day'
  if (result.interval < 30) return `${result.interval} days`
  const months = Math.round((result.interval / 30) * 10) / 10
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

/**
 * Check if a word is due for review today
 */
export function isWordDue(item: VocabularyItem, targetDate: Date = new Date()): boolean {
  if (item.mastered) return false
  // Never reviewed words or failed (reps === 0) words are considered due
  if (!item.dueDate || !item.lastReviewedAt || (item.repetitions ?? 0) === 0) {
    return true
  }
  const todayStr = formatDate(targetDate)
  return item.dueDate <= todayStr
}

/**
 * Filters vocabulary list for items due for review, prioritized by:
 * 1) Overdue & due-today review cards (oldest dueDate first)
 * 2) New / never-reviewed cards
 */
export function getDueVocabulary(items: VocabularyItem[], targetDate: Date = new Date()): VocabularyItem[] {
  const due = items.filter((item) => isWordDue(item, targetDate))
  return due.sort((a, b) => {
    const aIsNew = !a.lastReviewedAt || (a.repetitions ?? 0) === 0
    const bIsNew = !b.lastReviewedAt || (b.repetitions ?? 0) === 0
    if (aIsNew !== bIsNew) return aIsNew ? 1 : -1
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate)
    }
    return 0
  })
}

/**
 * Returns overall SRS statistics across vocabulary collection
 */
export function getSRSStats(items: VocabularyItem[], targetDate: Date = new Date()): SRSStats {
  const todayStr = formatDate(targetDate)
  let due = 0
  let newWords = 0
  let learning = 0
  let mastered = 0

  for (const item of items) {
    if (item.mastered) {
      mastered++
    } else if (!item.lastReviewedAt || (item.repetitions ?? 0) === 0) {
      newWords++
      due++
    } else if (item.dueDate && item.dueDate <= todayStr) {
      learning++
      due++
    } else {
      learning++
    }
  }

  return {
    total: items.length,
    due,
    newWords,
    learning,
    mastered,
  }
}

/**
 * Toggle mastered status for a word
 */
export function toggleWordMastered(
  item: VocabularyItem,
  forceState?: boolean,
  now: Date = new Date()
): VocabularyItem {
  const nextState = forceState !== undefined ? forceState : !item.mastered
  if (nextState) {
    return {
      ...item,
      mastered: true,
      interval: Math.max(item.interval || 0, 30),
      dueDate: addDays(now, 30),
      lastReviewedAt: now.toISOString(),
    }
  }
  return {
    ...item,
    mastered: false,
    interval: 1,
    dueDate: formatDate(now),
    lastReviewedAt: now.toISOString(),
  }
}

/**
 * Creates a cloze test sentence by replacing the target word with "[ ... ]"
 */
export function createClozeSentence(sentence: string, targetWord: string): string {
  if (!sentence || !targetWord) return sentence
  const trimmed = targetWord.trim()
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Check direct word with standard suffixes (s, es, ed, ing, d, ly)
  let regex = new RegExp(`\\b${escaped}(s|es|ed|ing|d|ly)?\\b`, 'gi')
  let result = sentence.replace(regex, '[ ... ]')
  if (result !== sentence) return result

  // If word ends with 'y', also match stem + 'ies' (e.g. opportunity -> opportunities)
  if (trimmed.endsWith('y') && trimmed.length > 2) {
    const stem = trimmed.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    regex = new RegExp(`\\b${stem}(y|ies)\\b`, 'gi')
    result = sentence.replace(regex, '[ ... ]')
    if (result !== sentence) return result
  }

  // Fallback
  return sentence.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[ ... ]')
}

function speakText(text: string, lang = 'en-GB', rate = 0.95): void {
  const trimmed = text?.trim()
  if (!trimmed) return
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(trimmed)
      utterance.lang = lang
      utterance.rate = rate
      const voices = window.speechSynthesis.getVoices?.() || []
      if (voices.length > 0) {
        const lowerLang = lang.toLowerCase()
        const matched =
          voices.find((v) => v.lang?.toLowerCase() === lowerLang && /natural|google|libby|ryan|sonia|neural/i.test(v.name)) ||
          voices.find((v) => v.lang?.toLowerCase() === lowerLang) ||
          voices.find((v) => v.lang?.toLowerCase().startsWith(lowerLang.slice(0, 2)))
        if (matched) utterance.voice = matched
      }
      window.speechSynthesis.speak(utterance)
    } catch {
      // ignore
    }
  }
}

/**
 * Pronounce word using Web Speech API
 */
export function speakWord(word: string, lang = 'en-GB'): void {
  speakText(word, lang, 0.92)
}

/**
 * Pronounce an example sentence using Web Speech API
 */
export function speakSentence(sentence: string, lang = 'en-GB'): void {
  speakText(sentence, lang, 0.95)
}
