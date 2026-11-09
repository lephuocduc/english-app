import type { Lesson, UserLessonProgress } from '../../types'

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

