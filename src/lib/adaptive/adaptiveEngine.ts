import type { AlignmentWord } from '../../types'
import { normalizeWord } from '../scoring/scorer'

export type AdaptiveWordStatus = 'weak' | 'learning' | 'mastered'
export type AdaptiveDifficultyAction = 'decrease' | 'maintain' | 'increase'
export type WordErrorCategory = 'ending_s' | 'vocab_or_listening'

export interface WordOutcomeInput {
  word: string
  outcome: 'correct' | 'incorrect' | 'missing'
  userWord?: string
  errorCategory?: WordErrorCategory
}

export interface AdaptiveWordEntry {
  word: string
  missCount: number
  wrongCount: number
  correctCount: number
  consecutiveCorrect: number
  endingSCount: number
  lastEndingSInput: string | null
  lastErrorType: 'missing' | 'incorrect' | null
  lastWrongInput: string | null
  status: AdaptiveWordStatus
  lastSeenAt: string
  updatedAt: string
}

export interface EndingSErrorExample {
  expectedWord: string
  lastTyped: string | null
  count: number
}

export interface EndingSTrainingSummary {
  totalEndingSErrors: number
  affectedWordsCount: number
  needsDrill: boolean
  topExamples: EndingSErrorExample[]
  guidanceVi: string
}

export interface AdaptiveLessonScoreEntry {
  lessonId: string
  lessonTitle: string
  firstAttemptAvg: number
  gradedSegments: number
  lastGradedAt: string
}

export interface AdaptiveDifficultyDirective {
  targetScore: number // 85%
  lowThreshold: number // 80%
  highThreshold: number // 90%
  referenceScore: number | null
  recentLessonCount: number
  action: AdaptiveDifficultyAction
  summaryVi: string
  rules: {
    sentenceWordRange: [number, number]
    vocabularyLevel: 'familiar' | 'current' | 'elevated'
    connectedSpeech: 'minimal' | 'moderate' | 'natural_fast'
    idiomsAndCollocations: boolean
  }
}

export interface AdaptiveLessonBlueprint {
  targetFirstAttemptAvg: number
  directive: AdaptiveDifficultyDirective
  priorityWeakWords: AdaptiveWordEntry[]
  weakWords: AdaptiveWordEntry[]
  masteredWords: AdaptiveWordEntry[]
  endingSTraining: EndingSTrainingSummary
  recentLessons: AdaptiveLessonScoreEntry[]
}

export const ADAPTIVE_TARGET_SCORE = 85
export const ADAPTIVE_LOW_THRESHOLD = 80
export const ADAPTIVE_HIGH_THRESHOLD = 90
export const MASTERED_CONSECUTIVE_THRESHOLD = 3
export const RECENT_LESSONS_WINDOW = 5

// Ultra-common English function words kept in raw stats, but de-prioritized behind content words
// when picking target Weak Words to actively reinforce in new lessons.
const COMMON_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'our', 'their', 'do', 'does', 'did', 'so', 'not', 'no',
  'yes', 'ok', 'hi', 'hey', 'oh', 'up', 'out',
])

// Non-inflectional word pairs that happen to differ by a trailing 's' but are completely different words
const NON_ENDING_S_WORDS = new Set([
  'is', 'as', 'us', 'his', 'has', 'was', 'yes', 'this', 'thus', 'plus', 'bus', 'gas', 'yes',
])

export function isContentWord(word: string): boolean {
  const norm = normalizeWord(word)
  if (norm.length < 3) return false
  if (/^\d+$/.test(norm)) return false
  return !COMMON_FUNCTION_WORDS.has(norm)
}

function differsOnlyByTrailingS(longer: string, shorter: string): boolean {
  if (shorter.length < 2) return false
  if (NON_ENDING_S_WORDS.has(longer)) return false

  // 1. Direct -s (servers/server, logs/log, alerts/alert, checks/check)
  if (longer === `${shorter}s`) return true

  // 2. Possessive / contraction -'s (server's/server, system's/system, that's/that)
  if (longer === `${shorter}'s`) return true

  // 3. Regular -es after sibilant or -o (patches/patch, crashes/crash, fixes/fix, processes/process, goes/go)
  if (longer === `${shorter}es` && /(?:s|x|z|ch|sh|o)$/.test(shorter)) return true

  // 4. Consonant + y -> -ies (queries/query, retries/retry, policies/policy, proxies/proxy)
  if (shorter.endsWith('y') && shorter.length >= 3 && longer === `${shorter.slice(0, -1)}ies`) {
    return true
  }

  return false
}

/**
 * Detects whether a word mismatch is purely a trailing -s / -es / -ies / 's ending sound error
 * (either missed final -s like "servers" -> "server", or hypercorrected extra -s like "server" -> "servers"),
 * rather than not knowing the word itself.
 */
export function isTrailingSEndingError(expectedWord: string, userWord?: string): boolean {
  if (!expectedWord || !userWord) return false
  const exp = normalizeWord(expectedWord)
  const usr = normalizeWord(userWord)
  if (!exp || !usr || exp === usr) return false

  return differsOnlyByTrailingS(exp, usr) || differsOnlyByTrailingS(usr, exp)
}

/**
 * Extracts normalized word-level outcomes from a dictation alignment result.
 * Distinguishes pure trailing -s ending errors from genuine vocabulary/listening errors.
 */
export function extractWordOutcomesFromAlignment(alignments: AlignmentWord[]): WordOutcomeInput[] {
  const outcomes: WordOutcomeInput[] = []
  for (const item of alignments) {
    if (item.status === 'extra' || !item.expectedWord) continue
    const normalized = normalizeWord(item.expectedWord)
    if (!normalized) continue
    const normalizedUser = item.userWord ? normalizeWord(item.userWord) : undefined
    const isEndingS =
      item.status === 'incorrect' && isTrailingSEndingError(normalized, normalizedUser)

    outcomes.push({
      word: normalized,
      outcome: item.status,
      userWord: normalizedUser,
      errorCategory:
        item.status === 'correct'
          ? undefined
          : isEndingS
            ? 'ending_s'
            : 'vocab_or_listening',
    })
  }
  return outcomes
}

/**
 * Applies one word outcome onto an existing hidden word memory entry.
 * Rules:
 * - Pure trailing -s error ('ending_s'):
 *   Records under endingSCount (ending sound error), does NOT mark the word itself as Weak vocabulary.
 * - Genuine 'incorrect' or 'missing':
 *   Increments wrong/miss count, resets consecutiveCorrect = 0, sets status = 'weak'.
 * - 'correct':
 *   Increments correctCount & consecutiveCorrect; if >= 3 consecutive => status = 'mastered'.
 */
export function updateAdaptiveWordEntry(
  existing: AdaptiveWordEntry | undefined,
  input: WordOutcomeInput,
  nowIso: string = new Date().toISOString()
): AdaptiveWordEntry {
  const word = normalizeWord(input.word)
  const base: AdaptiveWordEntry = existing
    ? { ...existing }
    : {
        word,
        missCount: 0,
        wrongCount: 0,
        correctCount: 0,
        consecutiveCorrect: 0,
        endingSCount: 0,
        lastEndingSInput: null,
        lastErrorType: null,
        lastWrongInput: null,
        status: 'learning',
        lastSeenAt: nowIso,
        updatedAt: nowIso,
      }

  const isEndingS =
    input.outcome === 'incorrect' &&
    (input.errorCategory === 'ending_s' || isTrailingSEndingError(word, input.userWord))

  if (input.outcome === 'correct') {
    base.correctCount += 1
    base.consecutiveCorrect += 1
    if (base.consecutiveCorrect >= MASTERED_CONSECUTIVE_THRESHOLD) {
      base.status = 'mastered'
    } else if (base.status !== 'weak') {
      base.status = 'learning'
    }
  } else if (isEndingS) {
    // Track purely as a trailing -s ending sound error, NOT as a weak vocabulary word
    base.endingSCount += 1
    base.lastEndingSInput = input.userWord || null
  } else {
    if (input.outcome === 'missing') {
      base.missCount += 1
    } else {
      base.wrongCount += 1
    }
    base.consecutiveCorrect = 0
    base.lastErrorType = input.outcome
    base.lastWrongInput = input.userWord || null
    base.status = 'weak'
  }

  base.lastSeenAt = nowIso
  base.updatedAt = nowIso
  return base
}

/**
 * Batch-applies word outcomes onto a Map<word, AdaptiveWordEntry> in order.
 */
export function applyWordOutcomesToMap(
  wordMap: Map<string, AdaptiveWordEntry>,
  outcomes: WordOutcomeInput[],
  nowIso: string = new Date().toISOString()
): AdaptiveWordEntry[] {
  const touched = new Map<string, AdaptiveWordEntry>()
  for (const item of outcomes) {
    const norm = normalizeWord(item.word)
    if (!norm) continue
    const updated = updateAdaptiveWordEntry(wordMap.get(norm), { ...item, word: norm }, nowIso)
    wordMap.set(norm, updated)
    touched.set(norm, updated)
  }
  return Array.from(touched.values())
}

/**
 * Computes difficulty adjustment directive around the 85% first-attempt target
 * based on the recent 5 lessons' first-attempt average scores:
 * - < 80%      => decrease difficulty slightly
 * - 80% – 90%  => maintain current level
 * - > 90%      => increase difficulty slightly
 */
export function computeAdaptiveDirective(
  recentLessons: AdaptiveLessonScoreEntry[]
): AdaptiveDifficultyDirective {
  const windowLessons = recentLessons.slice(0, RECENT_LESSONS_WINDOW)

  if (windowLessons.length === 0) {
    return {
      targetScore: ADAPTIVE_TARGET_SCORE,
      lowThreshold: ADAPTIVE_LOW_THRESHOLD,
      highThreshold: ADAPTIVE_HIGH_THRESHOLD,
      referenceScore: null,
      recentLessonCount: 0,
      action: 'maintain',
      summaryVi: 'Chưa có dữ liệu điểm lần đầu — giữ mức tiêu chuẩn ban đầu (mục tiêu ~85%).',
      rules: {
        sentenceWordRange: [10, 16],
        vocabularyLevel: 'current',
        connectedSpeech: 'moderate',
        idiomsAndCollocations: false,
      },
    }
  }

  const avg =
    Math.round(
      (windowLessons.reduce((sum, item) => sum + item.firstAttemptAvg, 0) / windowLessons.length) *
        10
    ) / 10

  if (avg < ADAPTIVE_LOW_THRESHOLD) {
    return {
      targetScore: ADAPTIVE_TARGET_SCORE,
      lowThreshold: ADAPTIVE_LOW_THRESHOLD,
      highThreshold: ADAPTIVE_HIGH_THRESHOLD,
      referenceScore: avg,
      recentLessonCount: windowLessons.length,
      action: 'decrease',
      summaryVi: `Điểm TB lần đầu ${windowLessons.length} bài gần nhất là ${avg}% (< 80%) → Giảm nhẹ độ khó: câu ngắn hơn (8–12 từ), từ vựng quen thuộc hơn, ít nối âm/nuốt âm.`,
      rules: {
        sentenceWordRange: [8, 12],
        vocabularyLevel: 'familiar',
        connectedSpeech: 'minimal',
        idiomsAndCollocations: false,
      },
    }
  }

  if (avg > ADAPTIVE_HIGH_THRESHOLD) {
    return {
      targetScore: ADAPTIVE_TARGET_SCORE,
      lowThreshold: ADAPTIVE_LOW_THRESHOLD,
      highThreshold: ADAPTIVE_HIGH_THRESHOLD,
      referenceScore: avg,
      recentLessonCount: windowLessons.length,
      action: 'increase',
      summaryVi: `Điểm TB lần đầu ${windowLessons.length} bài gần nhất là ${avg}% (> 90%) → Tăng nhẹ độ khó: câu dài hơn (14–22 từ), thêm từ vựng nâng cao, thành ngữ hoặc nối âm tự nhiên.`,
      rules: {
        sentenceWordRange: [14, 22],
        vocabularyLevel: 'elevated',
        connectedSpeech: 'natural_fast',
        idiomsAndCollocations: true,
      },
    }
  }

  return {
    targetScore: ADAPTIVE_TARGET_SCORE,
    lowThreshold: ADAPTIVE_LOW_THRESHOLD,
    highThreshold: ADAPTIVE_HIGH_THRESHOLD,
    referenceScore: avg,
    recentLessonCount: windowLessons.length,
    action: 'maintain',
    summaryVi: `Điểm TB lần đầu ${windowLessons.length} bài gần nhất là ${avg}% (trong vùng 80%–90%) → Giữ nguyên mức độ khó hiện tại quanh mục tiêu 85%.`,
    rules: {
      sentenceWordRange: [10, 16],
      vocabularyLevel: 'current',
      connectedSpeech: 'moderate',
      idiomsAndCollocations: false,
    },
  }
}

/**
 * Builds the complete next-lesson adaptive blueprint combining:
 * 1) Genuine Weak Words (excluding pure trailing -s errors)
 * 2) Mastered Words (>= 3 consecutive correct, to reduce frequency)
 * 3) Separate Trailing -s Ending Sound Error summary for targeted ear training
 * 4) Recent 5 lessons' first-attempt averages & difficulty adjustment directive (85% target)
 */
export function buildAdaptiveLessonBlueprint(
  words: AdaptiveWordEntry[],
  recentLessons: AdaptiveLessonScoreEntry[]
): AdaptiveLessonBlueprint {
  const weakWords = words
    .filter((w) => w.status === 'weak')
    .sort((a, b) => {
      const errDiff = b.missCount + b.wrongCount - (a.missCount + a.wrongCount)
      if (errDiff !== 0) return errDiff
      return b.updatedAt.localeCompare(a.updatedAt)
    })

  const priorityWeakWords = weakWords.filter((w) => isContentWord(w.word)).slice(0, 20)

  const masteredWords = words
    .filter((w) => w.status === 'mastered' && w.consecutiveCorrect >= MASTERED_CONSECUTIVE_THRESHOLD)
    .sort((a, b) => b.consecutiveCorrect - a.consecutiveCorrect || b.correctCount - a.correctCount)

  const endingSWords = words
    .filter((w) => w.endingSCount > 0)
    .sort((a, b) => b.endingSCount - a.endingSCount || b.updatedAt.localeCompare(a.updatedAt))

  const totalEndingSErrors = endingSWords.reduce((sum, w) => sum + w.endingSCount, 0)
  const topExamples: EndingSErrorExample[] = endingSWords.slice(0, 15).map((w) => ({
    expectedWord: w.word,
    lastTyped: w.lastEndingSInput,
    count: w.endingSCount,
  }))
  const needsDrill = totalEndingSErrors >= 3

  const endingSTraining: EndingSTrainingSummary = {
    totalEndingSErrors,
    affectedWordsCount: endingSWords.length,
    needsDrill,
    topExamples,
    guidanceVi: needsDrill
      ? `Phát hiện ${totalEndingSErrors} lần thiếu/thừa âm đuôi -s/-es (trên ${endingSWords.length} từ) — đã tách riêng là lỗi âm đuôi -s (không tính là từ vựng yếu). Nên lồng ghép câu có số nhiều / ngôi 3 số ít để luyện tai nghe âm -s đuôi.`
      : 'Ít lỗi âm đuôi -s — giữ tần suất số nhiều / ngôi 3 số ít tự nhiên.',
  }

  const trimmedLessons = [...recentLessons]
    .sort((a, b) => b.lastGradedAt.localeCompare(a.lastGradedAt))
    .slice(0, RECENT_LESSONS_WINDOW)

  return {
    targetFirstAttemptAvg: ADAPTIVE_TARGET_SCORE,
    directive: computeAdaptiveDirective(trimmedLessons),
    priorityWeakWords,
    weakWords,
    masteredWords,
    endingSTraining,
    recentLessons: trimmedLessons,
  }
}
