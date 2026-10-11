import { describe, it, expect } from 'vitest'
import {
  calculateNextReview,
  getIntervalPreviewText,
  isWordDue,
  getDueVocabulary,
  getSRSStats,
  toggleWordMastered,
  createClozeSentence,
  formatDate,
  addDays,
} from '../lib/srs/sm2'
import type { VocabularyItem } from '../types'

const baseMockWord: VocabularyItem = {
  id: 'v1',
  word: 'persistent',
  meaning: 'kiên trì, bền bỉ',
  contextSentence: 'She was persistent in pursuing her goals.',
  contextSentenceTranslation: 'Cô ấy đã rất kiên trì trong việc theo đuổi mục tiêu của mình.',
  timestamp: 10,
  videoId: 'vid1',
  lessonTitle: 'Lesson 1',
  savedAt: '2026-10-01T00:00:00.000Z',
}

describe('SM-2 Spaced Repetition Engine', () => {
  it('formats dates and adds days correctly', () => {
    const fixedDate = new Date('2026-10-11T12:00:00Z')
    expect(formatDate(fixedDate)).toBe('2026-10-11')
    expect(addDays(fixedDate, 3)).toBe('2026-10-14')
    expect(addDays(fixedDate, 0)).toBe('2026-10-11')
  })

  it('calculates initial review correctly for rating 3 (Good)', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const result = calculateNextReview(baseMockWord, 3, now)

    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
    expect(result.easeFactor).toBe(2.5)
    expect(result.dueDate).toBe('2026-10-12')
    expect(result.mastered).toBe(false)
  })

  it('calculates progressive intervals on consecutive Good ratings (SM-2 progression)', () => {
    const now = new Date('2026-10-11T12:00:00Z')

    // 1st review: Good -> 1 day
    const r1 = calculateNextReview(baseMockWord, 3, now)
    const item1: VocabularyItem = { ...baseMockWord, ...r1 }
    expect(item1.interval).toBe(1)

    // 2nd review: Good -> 3 days
    const r2 = calculateNextReview(item1, 3, now)
    const item2: VocabularyItem = { ...item1, ...r2 }
    expect(item2.repetitions).toBe(2)
    expect(item2.interval).toBe(3)

    // 3rd review: Good -> 3 * 2.5 = 8 days (rounded)
    const r3 = calculateNextReview(item2, 3, now)
    expect(r3.repetitions).toBe(3)
    expect(r3.interval).toBe(8)
  })

  it('resets interval and repetitions on rating 1 (Again)', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const experiencedWord: VocabularyItem = {
      ...baseMockWord,
      repetitions: 3,
      interval: 10,
      easeFactor: 2.5,
    }

    const result = calculateNextReview(experiencedWord, 1, now)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
    expect(result.easeFactor).toBe(2.3) // 2.5 - 0.2
    expect(result.mastered).toBe(false)
  })

  it('increases interval cautiously on rating 2 (Hard) and decreases ease factor', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const experiencedWord: VocabularyItem = {
      ...baseMockWord,
      repetitions: 2,
      interval: 5,
      easeFactor: 2.5,
    }

    const result = calculateNextReview(experiencedWord, 2, now)
    expect(result.repetitions).toBe(3)
    expect(result.interval).toBe(6) // 5 * 1.2 = 6
    expect(result.easeFactor).toBe(2.35) // 2.5 - 0.15
  })

  it('boosts interval and increases ease factor on rating 4 (Easy)', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const result = calculateNextReview(baseMockWord, 4, now)
    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(4) // initial easy is 4 days
    expect(result.easeFactor).toBe(2.65) // 2.5 + 0.15
  })

  it('generates accurate interval preview text for buttons', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    expect(getIntervalPreviewText(baseMockWord, 1, now)).toBe('1 ngày')
    expect(getIntervalPreviewText(baseMockWord, 3, now)).toBe('1 ngày')
    expect(getIntervalPreviewText(baseMockWord, 4, now)).toBe('4 ngày')
  })

  it('identifies due words correctly', () => {
    const today = new Date('2026-10-11T12:00:00Z')

    // New word without dueDate: due!
    expect(isWordDue(baseMockWord, today)).toBe(true)

    // Mastered word: not due
    expect(isWordDue({ ...baseMockWord, mastered: true }, today)).toBe(false)

    // Word due today
    expect(
      isWordDue(
        { ...baseMockWord, repetitions: 1, lastReviewedAt: '2026-10-10', dueDate: '2026-10-11' },
        today
      )
    ).toBe(true)

    // Word due yesterday (overdue): due!
    expect(
      isWordDue(
        { ...baseMockWord, repetitions: 1, lastReviewedAt: '2026-10-09', dueDate: '2026-10-10' },
        today
      )
    ).toBe(true)

    // Word due in 3 days: not due yet
    expect(
      isWordDue(
        { ...baseMockWord, repetitions: 1, lastReviewedAt: '2026-10-10', dueDate: '2026-10-14' },
        today
      )
    ).toBe(false)
  })

  it('filters due vocabulary and calculates stats accurately', () => {
    const today = new Date('2026-10-11T12:00:00Z')
    const list: VocabularyItem[] = [
      { ...baseMockWord, id: '1' }, // new -> due
      {
        ...baseMockWord,
        id: '2',
        repetitions: 1,
        lastReviewedAt: '2026-10-10',
        dueDate: '2026-10-11',
      }, // due today
      {
        ...baseMockWord,
        id: '3',
        repetitions: 2,
        lastReviewedAt: '2026-10-10',
        dueDate: '2026-10-15',
      }, // future -> not due
      {
        ...baseMockWord,
        id: '4',
        mastered: true,
      }, // mastered -> not due
    ]

    const dueList = getDueVocabulary(list, today)
    expect(dueList.map((x) => x.id)).toEqual(['1', '2'])

    const stats = getSRSStats(list, today)
    expect(stats.total).toBe(4)
    expect(stats.due).toBe(2)
    expect(stats.newWords).toBe(1)
    expect(stats.mastered).toBe(1)
    expect(stats.learning).toBe(2)
  })

  it('toggles mastered status on word', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const masteredWord = toggleWordMastered(baseMockWord, true, now)
    expect(masteredWord.mastered).toBe(true)
    expect(masteredWord.interval).toBe(30)
    expect(masteredWord.dueDate).toBe('2026-11-10')

    const unmastered = toggleWordMastered(masteredWord, false, now)
    expect(unmastered.mastered).toBe(false)
    expect(unmastered.interval).toBe(1)
    expect(unmastered.dueDate).toBe('2026-10-11')
  })

  it('creates cloze sentence hiding the target word', () => {
    const sentence = 'She was persistent in pursuing her goals.'
    const cloze = createClozeSentence(sentence, 'persistent')
    expect(cloze).toBe('She was [ ... ] in pursuing her goals.')

    const pluralSentence = 'We need multiple opportunities to practice.'
    const cloze2 = createClozeSentence(pluralSentence, 'opportunity')
    expect(cloze2).toBe('We need multiple [ ... ] to practice.')
  })
})
