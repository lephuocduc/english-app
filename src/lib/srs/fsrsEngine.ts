import {
  fsrs,
  createEmptyCard,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
  type RecordLogItem,
} from 'ts-fsrs'
import type {
  VocabularyItem,
  SRSRating,
  FSRSStateValue,
  VocabularyReviewLog,
} from '../../types'

export const DEFAULT_EASE_FACTOR = 2.5
export const MIN_EASE_FACTOR = 1.3

export const FSRS_STATE_LABELS: Record<FSRSStateValue, string> = {
  0: 'Mới',
  1: 'Đang học',
  2: 'Ôn tập',
  3: 'Học lại',
}

// Configure official ts-fsrs scheduler:
// - enable_short_term: true => authentic Anki/FSRS learning steps (1m, 5–6m, 10m) before graduating to Review days
// - enable_fuzz: false => deterministic preview labels match exact saved schedule
const fsrsParams = generatorParameters({
  enable_fuzz: false,
  enable_short_term: true,
})
const fsrsScheduler = fsrs(fsrsParams)

export interface SRSReviewResult {
  // Official FSRS card fields
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  learning_steps: number
  state: FSRSStateValue
  last_review: string

  // Synced compatibility fields
  interval: number
  easeFactor: number
  repetitions: number
  dueDate: string
  lastReviewedAt: string
  mastered: boolean
}

export interface FSRSScheduleOption {
  rating: SRSRating
  result: SRSReviewResult
  reviewLog: VocabularyReviewLog
  intervalText: string
}

export interface SRSStats {
  total: number
  due: number
  newWords: number
  learning: number
  review: number
  mastered: number
}

const MS_PER_DAY = 86_400_000

/**
 * Format a Date object to YYYY-MM-DD (local date)
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

function parseTimestamp(value?: string | null): Date | null {
  if (!value || !value.trim()) return null
  const trimmed = value.trim()
  const normalized = trimmed.length === 10 ? `${trimmed}T00:00:00.000Z` : trimmed
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function roundMetric(val: number): number {
  return Math.round(val * 10000) / 10000
}

function toFSRSStateValue(state: State | number): FSRSStateValue {
  if (state === 1 || state === 2 || state === 3) return state
  return 0
}

/**
 * Creates default FSRS fields for a brand-new vocabulary card using ts-fsrs createEmptyCard()
 */
export function createInitialFSRSFields(now: Date = new Date()): Partial<VocabularyItem> {
  const empty = createEmptyCard(now)
  const dueIso = empty.due.toISOString()
  return {
    due: dueIso,
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: 0,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    learning_steps: empty.learning_steps,
    state: toFSRSStateValue(empty.state),
    last_review: null,
    mastered: false,
    interval: 0,
    repetitions: 0,
    dueDate: formatDate(empty.due),
  }
}

/**
 * Converts a VocabularyItem (FSRS or legacy SM-2) into a ts-fsrs Card object
 */
export function vocabularyItemToFSRSCard(item: VocabularyItem, now: Date = new Date()): Card {
  const hasNativeFsrs =
    item.state !== undefined ||
    (item.stability !== undefined && item.stability > 0) ||
    (item.difficulty !== undefined && item.difficulty > 0) ||
    item.lapses !== undefined

  if (hasNativeFsrs) {
    const due = parseTimestamp(item.due) || parseTimestamp(item.dueDate) || now
    const lastReview = parseTimestamp(item.last_review ?? item.lastReviewedAt)
    const state = toFSRSStateValue(item.state ?? 0) as State
    return {
      due,
      stability: Math.max(0, Number(item.stability ?? 0)),
      difficulty: Math.min(10, Math.max(0, Number(item.difficulty ?? 0))),
      scheduled_days: Math.max(0, Math.round(Number(item.scheduled_days ?? item.interval ?? 0))),
      learning_steps: Math.max(0, Math.round(Number(item.learning_steps ?? 0))),
      reps: Math.max(0, Math.round(Number(item.reps ?? item.repetitions ?? 0))),
      lapses: Math.max(0, Math.round(Number(item.lapses ?? 0))),
      state,
      last_review: lastReview ?? undefined,
    }
  }

  // Seamless migration for legacy SM-2 items that were already reviewed before FSRS upgrade
  const legacyReps = Math.max(0, Math.round(Number(item.repetitions ?? 0)))
  const legacyInterval = Math.max(0, Math.round(Number(item.interval ?? 0)))
  const legacyLastReview = parseTimestamp(item.lastReviewedAt)

  if (legacyReps > 0 || legacyInterval > 0) {
    const due = parseTimestamp(item.due) || parseTimestamp(item.dueDate) || now
    const estimatedStability = Math.max(1, legacyInterval || 1)
    const legacyEase = Number(item.easeFactor ?? DEFAULT_EASE_FACTOR)
    // Map SM-2 ease (1.3..3.0) inversely into FSRS difficulty (1..10, default ~5.0)
    const estimatedDifficulty = Math.min(
      10,
      Math.max(1, Math.round((7.5 - (legacyEase - 1.3) * 2.5) * 100) / 100)
    )
    return {
      due,
      stability: estimatedStability,
      difficulty: estimatedDifficulty,
      scheduled_days: legacyInterval,
      learning_steps: 0,
      reps: Math.max(1, legacyReps),
      lapses: 0,
      state: State.Review,
      last_review: legacyLastReview ?? new Date(now.getTime() - legacyInterval * MS_PER_DAY),
    }
  }

  return createEmptyCard(now)
}

/**
 * Formats an FSRS interval cleanly for review buttons (e.g., "1 phút", "10 phút", "2 ngày", "1 tuần", "1.5 tháng")
 */
export function formatFSRSInterval(fromDate: Date, toDate: Date, scheduledDays: number): string {
  const diffMs = Math.max(0, toDate.getTime() - fromDate.getTime())

  if (scheduledDays <= 0) {
    const diffMinutes = Math.round(diffMs / 60_000)
    if (diffMinutes < 1) return '< 1 phút'
    if (diffMinutes < 60) return `${diffMinutes} phút`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} giờ`
    const fallbackDays = Math.max(1, Math.round(diffMs / MS_PER_DAY))
    return `${fallbackDays} ngày`
  }

  if (scheduledDays === 1) return '1 ngày'
  if (scheduledDays < 7) return `${scheduledDays} ngày`
  if (scheduledDays < 30) {
    if (scheduledDays % 7 === 0) {
      return `${scheduledDays / 7} tuần`
    }
    return `${scheduledDays} ngày`
  }
  if (scheduledDays < 365) {
    const months = Math.round((scheduledDays / 30) * 10) / 10
    return `${months} tháng`
  }
  const years = Math.round((scheduledDays / 365) * 10) / 10
  return `${years} năm`
}

function buildReviewResult(
  item: VocabularyItem,
  sourceCard: Card,
  outcome: RecordLogItem,
  rating: SRSRating,
  now: Date
): FSRSScheduleOption {
  const nextCard = outcome.card
  const log = outcome.log
  const prevReviewDate = sourceCard.last_review
  const elapsedDays = prevReviewDate
    ? Math.max(0, Math.round((now.getTime() - prevReviewDate.getTime()) / MS_PER_DAY))
    : 0

  const nextDueIso = nextCard.due.toISOString()
  const nowIso = now.toISOString()
  const nextState = toFSRSStateValue(nextCard.state)
  const nextStability = roundMetric(nextCard.stability)
  const nextDifficulty = roundMetric(nextCard.difficulty)
  const scheduledDays = Math.max(0, Math.round(nextCard.scheduled_days))

  // A card achieves Mastered status once FSRS memory stability reaches >= 30 days in Review state
  const isMastered =
    rating === 1
      ? false
      : Boolean(
          (item.mastered && rating >= 3) ||
            (nextState === 2 && nextStability >= 30 && scheduledDays >= 30 && nextCard.reps >= 4)
        )

  const result: SRSReviewResult = {
    due: nextDueIso,
    stability: nextStability,
    difficulty: nextDifficulty,
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    learning_steps: nextCard.learning_steps,
    state: nextState,
    last_review: nowIso,
    interval: scheduledDays,
    easeFactor: item.easeFactor ?? DEFAULT_EASE_FACTOR,
    repetitions: nextCard.reps,
    dueDate: formatDate(nextCard.due),
    lastReviewedAt: nowIso,
    mastered: isMastered,
  }

  const reviewLog: VocabularyReviewLog = {
    card_id: item.id,
    rating,
    state: toFSRSStateValue(log.state),
    due: log.due.toISOString(),
    stability: roundMetric(log.stability),
    difficulty: roundMetric(log.difficulty),
    elapsed_days: elapsedDays,
    scheduled_days: Math.max(0, Math.round(log.scheduled_days)),
    learning_steps: log.learning_steps,
    review_time: log.review.toISOString(),
  }

  return {
    rating,
    result,
    reviewLog,
    intervalText: formatFSRSInterval(now, nextCard.due, scheduledDays),
  }
}

/**
 * Precomputes all 4 FSRS scheduling outcomes (1: Again, 2: Hard, 3: Good, 4: Easy)
 * for a card at a given timestamp using ts-fsrs repeat().
 */
export function getSchedulingPreviews(
  item: VocabularyItem,
  now: Date = new Date()
): Record<SRSRating, FSRSScheduleOption> {
  const card = vocabularyItemToFSRSCard(item, now)
  const recordLog = fsrsScheduler.repeat(card, now)

  const ratings: Array<{ key: SRSRating; grade: Grade }> = [
    { key: 1, grade: Rating.Again },
    { key: 2, grade: Rating.Hard },
    { key: 3, grade: Rating.Good },
    { key: 4, grade: Rating.Easy },
  ]

  const previews = {} as Record<SRSRating, FSRSScheduleOption>
  for (const { key, grade } of ratings) {
    previews[key] = buildReviewResult(item, card, recordLog[grade], key, now)
  }
  return previews
}

/**
 * Computes the next FSRS card state for a single chosen rating (1: Again, 2: Hard, 3: Good, 4: Easy)
 */
export function calculateNextReview(
  item: VocabularyItem,
  rating: SRSRating,
  now: Date = new Date()
): SRSReviewResult {
  return getSchedulingPreviews(item, now)[rating].result
}

/**
 * Returns human-friendly FSRS interval preview text for a review button
 */
export function getIntervalPreviewText(
  item: VocabularyItem,
  rating: SRSRating,
  now: Date = new Date()
): string {
  return getSchedulingPreviews(item, now)[rating].intervalText
}

/**
 * Returns a human-friendly next-review badge label for a card in the vocabulary list
 */
export function getNextReviewBadgeText(item: VocabularyItem, now: Date = new Date()): string {
  const dueDate = parseTimestamp(item.due) || parseTimestamp(item.dueDate)
  if (!dueDate) return 'Mới'
  const diffMs = dueDate.getTime() - now.getTime()
  if (diffMs <= 0) return 'Đến hạn'
  const scheduledDays = Math.floor(diffMs / MS_PER_DAY)
  return `Ôn sau ${formatFSRSInterval(now, dueDate, scheduledDays)}`
}

/**
 * Check if a word is due for review (due <= now)
 */
export function isWordDue(item: VocabularyItem, now: Date = new Date()): boolean {
  if (item.mastered) return false

  // FSRS native UTC timestamp check: due <= current time
  if (item.due) {
    const dueDate = parseTimestamp(item.due)
    if (dueDate) {
      return dueDate.getTime() <= now.getTime()
    }
  }

  // Brand-new or unreviewed card is always due
  const reps = item.reps ?? item.repetitions ?? 0
  const lastRev = item.last_review ?? item.lastReviewedAt
  if (!item.dueDate || !lastRev || reps === 0) {
    return true
  }

  // Legacy YYYY-MM-DD fallback
  const todayStr = formatDate(now)
  return item.dueDate <= todayStr
}

/**
 * Filters vocabulary list for items due for review (due <= now), prioritized by:
 * 1) Overdue / Learning / Review cards (earliest due timestamp first)
 * 2) Brand-new cards (state === 0)
 */
export function getDueVocabulary(items: VocabularyItem[], now: Date = new Date()): VocabularyItem[] {
  const due = items.filter((item) => isWordDue(item, now))
  return due.sort((a, b) => {
    const aIsNew = (a.state ?? ((a.reps ?? a.repetitions ?? 0) > 0 ? 2 : 0)) === 0
    const bIsNew = (b.state ?? ((b.reps ?? b.repetitions ?? 0) > 0 ? 2 : 0)) === 0
    if (aIsNew !== bIsNew) return aIsNew ? 1 : -1

    const aTime = (parseTimestamp(a.due) || parseTimestamp(a.dueDate))?.getTime() ?? 0
    const bTime = (parseTimestamp(b.due) || parseTimestamp(b.dueDate))?.getTime() ?? 0
    return aTime - bTime
  })
}

/**
 * Returns overall FSRS statistics across vocabulary collection
 */
export function getSRSStats(items: VocabularyItem[], now: Date = new Date()): SRSStats {
  let due = 0
  let newWords = 0
  let learning = 0
  let review = 0
  let mastered = 0

  for (const item of items) {
    if (item.mastered) {
      mastered++
      continue
    }

    const state = item.state ?? ((item.reps ?? item.repetitions ?? 0) > 0 ? 2 : 0)
    if (isWordDue(item, now)) {
      due++
    }

    if (state === 0) {
      newWords++
    } else if (state === 1 || state === 3) {
      learning++
    } else {
      review++
    }
  }

  return {
    total: items.length,
    due,
    newWords,
    learning: learning + review,
    review,
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
    const futureDue = new Date(now.getTime() + 30 * MS_PER_DAY)
    return {
      ...item,
      mastered: true,
      due: futureDue.toISOString(),
      stability: Math.max(item.stability ?? 0, 30),
      scheduled_days: Math.max(item.scheduled_days ?? item.interval ?? 0, 30),
      state: 2,
      last_review: now.toISOString(),
      interval: Math.max(item.interval || 0, 30),
      dueDate: addDays(now, 30),
      lastReviewedAt: now.toISOString(),
    }
  }
  return {
    ...item,
    mastered: false,
    due: now.toISOString(),
    scheduled_days: 1,
    state: 3,
    last_review: now.toISOString(),
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
          voices.find(
            (v) =>
              v.lang?.toLowerCase() === lowerLang &&
              /natural|google|libby|ryan|sonia|neural/i.test(v.name)
          ) ||
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
