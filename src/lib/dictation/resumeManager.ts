import type { Lesson, UserLessonProgress, SentenceSegment, UserSentenceProgress } from '../../types'

/**
 * Calculates the highest sentence index currently unlocked for sequential study.
 * Strict sequential listening: you can only listen up to the first uncompleted sentence.
 * All subsequent sentences remain locked until the current one is completed (score >= 80% or completed).
 */
export function getMaxUnlockedIndex(
  sentences?: SentenceSegment[],
  sentenceProgress?: Record<string, UserSentenceProgress> | null
): number {
  if (!sentences || sentences.length === 0) {
    return 0
  }
  if (!sentenceProgress) {
    return 0
  }

  for (let i = 0; i < sentences.length; i++) {
    const prog = sentenceProgress[sentences[i].id]
    const isDone = Boolean(prog?.completed || (prog?.score ?? 0) >= 80 || prog?.isRevealed)
    if (!isDone) {
      return i
    }
  }

  return sentences.length - 1
}

/**
 * Determines the best sentence index to resume practice on for a given lesson.
 *
 * Rules:
 * 1. If `lastSentenceId` was recorded:
 *    - If that sentence is already completed, advance to the NEXT sentence (index + 1)
 *    - If that sentence is not completed yet, resume right on it
 * 2. If no `lastSentenceId` or invalid, find the first sentence in sequence that is not completed.
 * 3. If all sentences are completed or no sentences exist, return 0.
 */
export function getResumeSegmentIndex(
  lesson?: Lesson,
  progress?: UserLessonProgress | null
): number {
  if (!lesson || !lesson.sentences || lesson.sentences.length === 0) {
    return 0
  }

  if (!progress || !progress.sentenceProgress) {
    return 0
  }

  // Check lastSentenceId first
  const lastId = progress.lastSentenceId
  if (lastId) {
    const lastIndex = lesson.sentences.findIndex((s) => s.id === lastId)
    if (lastIndex !== -1) {
      const isLastCompleted = Boolean(progress.sentenceProgress[lastId]?.completed)
      if (isLastCompleted && lastIndex + 1 < lesson.sentences.length) {
        return lastIndex + 1
      }
      if (!isLastCompleted) {
        return lastIndex
      }
    }
  }

  // Scan for first uncompleted sentence
  const firstUncompletedIndex = lesson.sentences.findIndex(
    (s) => !progress.sentenceProgress[s.id]?.completed
  )

  if (firstUncompletedIndex !== -1) {
    return firstUncompletedIndex
  }

  return 0
}

/**
 * Checks if all sentences in a lesson have been marked completed.
 */
export function isLessonCompleted(
  lesson?: Lesson,
  progress?: UserLessonProgress | null
): boolean {
  if (!lesson || !lesson.sentences || lesson.sentences.length === 0) {
    return false
  }
  if (!progress || !progress.sentenceProgress) {
    return false
  }

  return lesson.sentences.every((s) => Boolean(progress.sentenceProgress[s.id]?.completed))
}

/**
 * Checks whether every sentence in a lesson has been finished
 * (completed / score >= 80% / or revealed) so the full transcript can be unlocked safely.
 */
export function isLessonFinished(
  sentences?: SentenceSegment[],
  sentenceProgress?: Record<string, UserSentenceProgress> | null
): boolean {
  if (!sentences || sentences.length === 0 || !sentenceProgress) {
    return false
  }
  return sentences.every((s) => {
    const p = sentenceProgress[s.id]
    return Boolean(p?.completed || (p?.score ?? 0) >= 80 || p?.isRevealed)
  })
}

function hasAnyLessonProgress(
  sentences?: SentenceSegment[],
  sentenceProgress?: Record<string, UserSentenceProgress> | null
): boolean {
  if (!sentences || sentences.length === 0 || !sentenceProgress) {
    return false
  }
  return sentences.some((s) => {
    const p = sentenceProgress[s.id]
    return Boolean(
      p?.completed ||
        (p?.score ?? 0) >= 80 ||
        p?.isRevealed ||
        p?.userInput?.trim() ||
        (p?.attempts ?? 0) > 0
    )
  })
}

/**
 * Returns the next uncompleted lesson after `currentLessonId` (wrapping around), or null if all are finished.
 */
export function getNextUncompletedLesson(
  lessons: Lesson[],
  progressMap: Record<string, UserLessonProgress | undefined>,
  currentLessonId?: string | null
): Lesson | null {
  if (!lessons || lessons.length === 0) return null

  const startIndex = currentLessonId ? lessons.findIndex((l) => l.id === currentLessonId) : -1
  for (let offset = 1; offset <= lessons.length; offset++) {
    const idx = (startIndex + offset) % lessons.length
    const candidate = lessons[idx]
    if (!candidate) continue
    if (candidate.id === currentLessonId && lessons.length > 1) continue
    if (!isLessonFinished(candidate.sentences, progressMap[candidate.id]?.sentenceProgress)) {
      return candidate
    }
  }
  return null
}

/**
 * Selects the best lesson to display on the Home / Practice page:
 * 1) A lesson currently in progress (started, not yet finished) — preferring savedActiveLessonId if it is in progress.
 * 2) If savedActiveLessonId is already finished, advance to the next uncompleted lesson.
 * 3) Otherwise keep savedActiveLessonId if uncompleted, or pick the first uncompleted lesson.
 * 4) Fallback to lessons[0] if every lesson is completed.
 */
export function selectHomeLessonId(
  lessons: Lesson[],
  progressMap: Record<string, UserLessonProgress | undefined>,
  savedActiveLessonId?: string | null
): string {
  if (!lessons || lessons.length === 0) return ''

  const isInProgress = (l: Lesson): boolean => {
    const sp = progressMap[l.id]?.sentenceProgress
    return hasAnyLessonProgress(l.sentences, sp) && !isLessonFinished(l.sentences, sp)
  }

  const savedLesson = savedActiveLessonId
    ? lessons.find((l) => l.id === savedActiveLessonId)
    : undefined

  // 1. Saved lesson is currently in progress -> resume it
  if (savedLesson && isInProgress(savedLesson)) {
    return savedLesson.id
  }

  // 2. Any other lesson is currently in progress -> resume it
  const anyInProgress = lessons.find((l) => isInProgress(l))
  if (anyInProgress) {
    return anyInProgress.id
  }

  // 3. Saved lesson is already finished -> advance to next uncompleted lesson
  if (savedLesson && isLessonFinished(savedLesson.sentences, progressMap[savedLesson.id]?.sentenceProgress)) {
    const next = getNextUncompletedLesson(lessons, progressMap, savedLesson.id)
    return next ? next.id : savedLesson.id
  }

  // 4. Saved lesson exists and is not finished -> keep it
  if (savedLesson) {
    return savedLesson.id
  }

  // 5. Pick first uncompleted lesson, or fallback to first lesson
  const firstUncompleted = lessons.find(
    (l) => !isLessonFinished(l.sentences, progressMap[l.id]?.sentenceProgress)
  )
  return firstUncompleted ? firstUncompleted.id : lessons[0].id
}

