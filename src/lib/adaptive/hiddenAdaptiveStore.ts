import type { AlignmentWord } from '../../types'
import {
  applyWordOutcomesToMap,
  buildAdaptiveLessonBlueprint,
  extractWordOutcomesFromAlignment,
  RECENT_LESSONS_WINDOW,
  type AdaptiveLessonBlueprint,
  type AdaptiveLessonScoreEntry,
  type AdaptiveWordEntry,
} from './adaptiveEngine'

const HIDDEN_STORAGE_KEY = 'listenflow_hidden_adaptive_memory_v1'

interface HiddenLessonSegmentScores {
  lessonId: string
  lessonTitle: string
  firstAttemptBySegment: Record<string, number>
  lastGradedAt: string
}

interface HiddenAdaptiveState {
  words: Record<string, AdaptiveWordEntry>
  lessons: Record<string, HiddenLessonSegmentScores>
  updatedAt: string
}

function createEmptyState(): HiddenAdaptiveState {
  return {
    words: {},
    lessons: {},
    updatedAt: new Date().toISOString(),
  }
}

function loadState(): HiddenAdaptiveState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyState()
  }
  try {
    const raw = window.localStorage.getItem(HIDDEN_STORAGE_KEY)
    if (!raw) return createEmptyState()
    const parsed = JSON.parse(raw) as Partial<HiddenAdaptiveState>
    return {
      words: parsed.words && typeof parsed.words === 'object' ? parsed.words : {},
      lessons: parsed.lessons && typeof parsed.lessons === 'object' ? parsed.lessons : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return createEmptyState()
  }
}

function saveState(state: HiddenAdaptiveState): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Silent failure: never disrupt study flow
  }
}

/**
 * Silent background store for the hidden adaptive database.
 * Never rendered on screen — silently records Weak Words, Mastered Words (>=3 consecutive),
 * and First-Attempt lesson score history after every graded dictation check.
 */
export const hiddenAdaptiveStore = {
  recordGradedCheck(params: {
    lessonId: string
    lessonTitle?: string
    segmentId: string
    score: number
    alignments: AlignmentWord[]
    isFirstAttempt: boolean
    nowIso?: string
  }): void {
    const nowIso = params.nowIso || new Date().toISOString()
    const state = loadState()

    // 1 & 2. Silently update Weak Words & Mastered Words from word-level alignment
    const wordMap = new Map<string, AdaptiveWordEntry>(Object.entries(state.words))
    const outcomes = extractWordOutcomesFromAlignment(params.alignments)
    applyWordOutcomesToMap(wordMap, outcomes, nowIso)
    state.words = Object.fromEntries(wordMap.entries())

    // 3. Silently record first-attempt score for this lesson/segment
    if (params.lessonId && params.segmentId) {
      const existingLesson = state.lessons[params.lessonId] || {
        lessonId: params.lessonId,
        lessonTitle: params.lessonTitle || params.lessonId,
        firstAttemptBySegment: {},
        lastGradedAt: nowIso,
      }
      if (params.lessonTitle) {
        existingLesson.lessonTitle = params.lessonTitle
      }
      if (
        params.isFirstAttempt ||
        existingLesson.firstAttemptBySegment[params.segmentId] === undefined
      ) {
        existingLesson.firstAttemptBySegment[params.segmentId] = params.score
        existingLesson.lastGradedAt = nowIso
      }
      state.lessons[params.lessonId] = existingLesson
    }

    state.updatedAt = nowIso
    saveState(state)
  },

  getBlueprint(): AdaptiveLessonBlueprint {
    const state = loadState()
    const lessonEntries: AdaptiveLessonScoreEntry[] = Object.values(state.lessons)
      .map((l) => {
        const scores = Object.values(l.firstAttemptBySegment)
        const avg =
          scores.length > 0
            ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
            : 0
        return {
          lessonId: l.lessonId,
          lessonTitle: l.lessonTitle,
          firstAttemptAvg: avg,
          gradedSegments: scores.length,
          lastGradedAt: l.lastGradedAt,
        }
      })
      .filter((l) => l.gradedSegments > 0)
      .sort((a, b) => b.lastGradedAt.localeCompare(a.lastGradedAt))
      .slice(0, RECENT_LESSONS_WINDOW)

    return buildAdaptiveLessonBlueprint(Object.values(state.words), lessonEntries)
  },

  clear(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(HIDDEN_STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  },
}
