import type { Lesson, UserLessonProgress, SentenceSegment, UserSentenceProgress } from '../../types'
import { isAudioLesson } from '../audio/textToLesson'

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

/**
 * Finds the next lesson matching the same source type (Audio vs YouTube) and the same level.
 * Prioritizes the next uncompleted lesson after the current one (wrapping around),
 * and falls back to the immediate next same-level lesson if all are already completed.
 */
export function getNextSameLevelLesson(
  lessons: Lesson[],
  currentLesson?: Lesson | null,
  allLessonsProgress?: Record<string, UserLessonProgress>
): Lesson | null {
  if (!currentLesson || !lessons || lessons.length <= 1) {
    return null
  }

  const currentIsAudio = isAudioLesson(currentLesson)
  const currentLevel = currentLesson.level || 'Intermediate'

  const sameGroup = lessons.filter(
    (l) => isAudioLesson(l) === currentIsAudio && (l.level || 'Intermediate') === currentLevel
  )

  if (sameGroup.length <= 1) {
    return null
  }

  const curIdx = sameGroup.findIndex((l) => l.id === currentLesson.id)
  const orderedAfterCurrent =
    curIdx >= 0
      ? [...sameGroup.slice(curIdx + 1), ...sameGroup.slice(0, curIdx)]
      : sameGroup.filter((l) => l.id !== currentLesson.id)

  if (orderedAfterCurrent.length === 0) {
    return null
  }

  // Prefer the first uncompleted same-level lesson
  const nextUncompleted = orderedAfterCurrent.find(
    (l) => !isLessonFinished(l.sentences, allLessonsProgress?.[l.id]?.sentenceProgress)
  )

  return nextUncompleted || orderedAfterCurrent[0]
}

