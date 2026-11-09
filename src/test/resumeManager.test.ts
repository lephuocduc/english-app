import { describe, it, expect } from 'vitest'
import { getResumeSegmentIndex, isLessonCompleted } from '../lib/dictation/resumeManager'
import type { Lesson, UserLessonProgress } from '../types'

describe('Dictation Resume Manager', () => {
  const mockLesson: Lesson = {
    id: 'lesson-1',
    title: 'Test Lesson',
    videoId: 'abc',
    sentences: [
      { id: 's-1', startTime: 0, endTime: 5, text: 'First sentence' },
      { id: 's-2', startTime: 5, endTime: 10, text: 'Second sentence' },
      { id: 's-3', startTime: 10, endTime: 15, text: 'Third sentence' },
    ],
  }

  it('defaults to index 0 when no progress exists', () => {
    expect(getResumeSegmentIndex(mockLesson, null)).toBe(0)
    expect(getResumeSegmentIndex(undefined, null)).toBe(0)
  })

  it('resumes on the next sentence if lastSentenceId was completed', () => {
    const progress: UserLessonProgress = {
      lessonId: 'lesson-1',
      lastSentenceId: 's-1',
      updatedAt: '2026-11-09T00:00:00Z',
      sentenceProgress: {
        's-1': {
          sentenceId: 's-1',
          userInput: 'First sentence',
          score: 100,
          isRevealed: false,
          attempts: 1,
          completed: true,
          lastAttemptAt: '2026-11-09T00:00:00Z',
        },
      },
    }

    // Should advance to s-2 (index 1)
    expect(getResumeSegmentIndex(mockLesson, progress)).toBe(1)
  })

  it('resumes on the same sentence if lastSentenceId is not completed yet', () => {
    const progress: UserLessonProgress = {
      lessonId: 'lesson-1',
      lastSentenceId: 's-2',
      updatedAt: '2026-11-09T00:00:00Z',
      sentenceProgress: {
        's-1': {
          sentenceId: 's-1',
          userInput: 'First sentence',
          score: 100,
          isRevealed: false,
          attempts: 1,
          completed: true,
          lastAttemptAt: '2026-11-09T00:00:00Z',
        },
        's-2': {
          sentenceId: 's-2',
          userInput: 'Second',
          score: 40,
          isRevealed: false,
          attempts: 1,
          completed: false, // in progress
          lastAttemptAt: '2026-11-09T00:00:00Z',
        },
      },
    }

    // Should stay on s-2 (index 1)
    expect(getResumeSegmentIndex(mockLesson, progress)).toBe(1)
  })

  it('finds first uncompleted sentence if lastSentenceId is missing or invalid', () => {
    const progress: UserLessonProgress = {
      lessonId: 'lesson-1',
      lastSentenceId: '',
      updatedAt: '2026-11-09T00:00:00Z',
      sentenceProgress: {
        's-1': {
          sentenceId: 's-1',
          userInput: 'First sentence',
          score: 100,
          isRevealed: false,
          attempts: 1,
          completed: true,
          lastAttemptAt: '2026-11-09T00:00:00Z',
        },
      },
    }

    expect(getResumeSegmentIndex(mockLesson, progress)).toBe(1)
  })

  it('detects when entire lesson is completed', () => {
    const progress: UserLessonProgress = {
      lessonId: 'lesson-1',
      lastSentenceId: 's-3',
      updatedAt: '2026-11-09T00:00:00Z',
      sentenceProgress: {
        's-1': { sentenceId: 's-1', userInput: '', score: 100, isRevealed: false, attempts: 1, completed: true, lastAttemptAt: '' },
        's-2': { sentenceId: 's-2', userInput: '', score: 100, isRevealed: false, attempts: 1, completed: true, lastAttemptAt: '' },
        's-3': { sentenceId: 's-3', userInput: '', score: 100, isRevealed: false, attempts: 1, completed: true, lastAttemptAt: '' },
      },
    }

    expect(isLessonCompleted(mockLesson, progress)).toBe(true)
    expect(getResumeSegmentIndex(mockLesson, progress)).toBe(0) // loops back to 0
  })
})

