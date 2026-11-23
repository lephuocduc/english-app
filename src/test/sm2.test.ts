import { describe, it, expect } from 'vitest'
import {
  createInitialFSRSFields,
  getSchedulingPreviews,
  calculateNextReview,
  getIntervalPreviewText,
  formatFSRSInterval,
  isWordDue,
  getDueVocabulary,
  getSRSStats,
  toggleWordMastered,
  createClozeSentence,
  formatDate,
  addDays,
} from '../lib/srs/fsrsEngine'
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

describe('FSRS Spaced Repetition Engine (ts-fsrs)', () => {
  it('formats dates and adds days correctly', () => {
    const fixedDate = new Date('2026-10-11T12:00:00Z')
    expect(formatDate(fixedDate)).toBe('2026-10-11')
    expect(addDays(fixedDate, 3)).toBe('2026-10-14')
    expect(addDays(fixedDate, 0)).toBe('2026-10-11')
  })

  it('initializes a brand-new card via ts-fsrs createEmptyCard defaults', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const init = createInitialFSRSFields(now)

    expect(init.state).toBe(0)
    expect(init.due).toBe('2026-10-11T12:00:00.000Z')
    expect(init.stability).toBe(0)
    expect(init.difficulty).toBe(0)
    expect(init.elapsed_days).toBe(0)
    expect(init.scheduled_days).toBe(0)
    expect(init.reps).toBe(0)
    expect(init.lapses).toBe(0)
    expect(init.last_review).toBeNull()
    expect(init.mastered).toBe(false)
  })

  it('precomputes all 4 FSRS ratings (Again, Hard, Good, Easy) with monotonic intervals and review logs', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const newCard: VocabularyItem = { ...baseMockWord, ...createInitialFSRSFields(now) }
    const previews = getSchedulingPreviews(newCard, now)

    const againDue = new Date(previews[1].result.due).getTime()
    const hardDue = new Date(previews[2].result.due).getTime()
    const goodDue = new Date(previews[3].result.due).getTime()
    const easyDue = new Date(previews[4].result.due).getTime()

    expect(againDue).toBeGreaterThan(now.getTime())
    expect(hardDue).toBeGreaterThan(againDue)
    expect(goodDue).toBeGreaterThan(hardDue)
    expect(easyDue).toBeGreaterThan(goodDue)

    // New card: Again/Hard/Good enter short-term Learning (state 1), Easy graduates straight to Review (state 2)
    expect(previews[1].result.state).toBe(1)
    expect(previews[2].result.state).toBe(1)
    expect(previews[3].result.state).toBe(1)
    expect(previews[4].result.state).toBe(2)
    expect(previews[4].result.scheduled_days).toBeGreaterThanOrEqual(4)

    // Stability & Difficulty are populated by ts-fsrs
    expect(previews[3].result.stability).toBeGreaterThan(0)
    expect(previews[3].result.difficulty).toBeGreaterThanOrEqual(1)
    expect(previews[3].result.difficulty).toBeLessThanOrEqual(10)
    expect(previews[3].result.reps).toBe(1)
    expect(previews[3].result.last_review).toBe(now.toISOString())

    // Review log matches card_id, rating, and timestamp
    expect(previews[3].reviewLog.card_id).toBe('v1')
    expect(previews[3].reviewLog.rating).toBe(3)
    expect(previews[3].reviewLog.state).toBe(0)
    expect(previews[3].reviewLog.review_time).toBe(now.toISOString())

    // Human-readable Vietnamese interval previews
    expect(previews[1].intervalText).toContain('phút')
    expect(previews[3].intervalText).toContain('phút')
    expect(previews[4].intervalText).toContain('ngày')
  })

  it('graduates a Learning card to Review and grows stability across consecutive Good reviews', () => {
    const t0 = new Date('2026-10-11T12:00:00Z')
    const card0: VocabularyItem = { ...baseMockWord, ...createInitialFSRSFields(t0) }

    // 1st review: Good -> Learning step (+10 min)
    const r1 = calculateNextReview(card0, 3, t0)
    const card1: VocabularyItem = { ...card0, ...r1 }
    expect(card1.state).toBe(1)
    expect(card1.reps).toBe(1)

    // 2nd review at due time (+10 min): Good -> graduates to Review (state 2) with scheduled_days >= 1
    const t1 = new Date(card1.due!)
    const r2 = calculateNextReview(card1, 3, t1)
    const card2: VocabularyItem = { ...card1, ...r2 }
    expect(card2.state).toBe(2)
    expect(card2.reps).toBe(2)
    expect(card2.scheduled_days).toBeGreaterThanOrEqual(1)

    // 3rd review when due -> scheduled_days & stability grow further
    const t2 = new Date(card2.due!)
    const r3 = calculateNextReview(card2, 3, t2)
    expect(r3.state).toBe(2)
    expect(r3.reps).toBe(3)
    expect(r3.elapsed_days).toBe(card2.scheduled_days)
    expect(r3.stability).toBeGreaterThan(card2.stability!)
    expect(r3.scheduled_days).toBeGreaterThan(card2.scheduled_days!)
  })

  it('increments lapses and enters Relearning (state 3) when rating Again on a Review card', () => {
    const t0 = new Date('2026-10-11T12:00:00Z')
    const reviewCard: VocabularyItem = {
      ...baseMockWord,
      due: '2026-10-11T00:00:00.000Z',
      stability: 12,
      difficulty: 5,
      elapsed_days: 10,
      scheduled_days: 10,
      reps: 4,
      lapses: 0,
      learning_steps: 0,
      state: 2,
      last_review: '2026-10-01T00:00:00.000Z',
    }

    const result = calculateNextReview(reviewCard, 1, t0)
    expect(result.state).toBe(3) // Relearning
    expect(result.lapses).toBe(1)
    expect(result.reps).toBe(5)
    expect(result.scheduled_days).toBe(0)
    expect(result.stability).toBeLessThan(reviewCard.stability!)
    expect(result.mastered).toBe(false)
  })

  it('migrates legacy SM-2 reviewed cards seamlessly into FSRS Review state', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const legacyCard: VocabularyItem = {
      ...baseMockWord,
      repetitions: 3,
      interval: 8,
      easeFactor: 2.5,
      dueDate: '2026-10-11',
      lastReviewedAt: '2026-10-03T12:00:00.000Z',
    }

    const res = calculateNextReview(legacyCard, 3, now)
    expect(res.state).toBe(2)
    expect(res.reps).toBe(4)
    expect(res.scheduled_days).toBeGreaterThan(8)
    expect(res.stability).toBeGreaterThan(8)
  })

  it('formats FSRS interval labels across minutes, hours, days, weeks, and months', () => {
    const base = new Date('2026-10-11T12:00:00Z')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 60_000), 0)).toBe('1 phút')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 10 * 60_000), 0)).toBe('10 phút')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 2 * 3600_000), 0)).toBe('2 giờ')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 86_400_000), 1)).toBe('1 ngày')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 5 * 86_400_000), 5)).toBe('5 ngày')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 7 * 86_400_000), 7)).toBe('1 tuần')
    expect(formatFSRSInterval(base, new Date(base.getTime() + 30 * 86_400_000), 30)).toBe('1 tháng')
    expect(getIntervalPreviewText(baseMockWord, 4, base)).toMatch(/ngày|tuần/)
  })

  it('identifies due words accurately using FSRS UTC due timestamps (due <= now)', () => {
    const now = new Date('2026-10-11T12:00:00Z')

    // New word without due: due!
    expect(isWordDue(baseMockWord, now)).toBe(true)

    // Mastered word: not due
    expect(isWordDue({ ...baseMockWord, mastered: true }, now)).toBe(false)

    // Word due 1 minute ago: due!
    expect(
      isWordDue({ ...baseMockWord, state: 1, due: '2026-10-11T11:59:00.000Z', reps: 1 }, now)
    ).toBe(true)

    // Word due 5 minutes from now: NOT due yet!
    expect(
      isWordDue({ ...baseMockWord, state: 1, due: '2026-10-11T12:05:00.000Z', reps: 1 }, now)
    ).toBe(false)

    // Legacy word due yesterday: due!
    expect(
      isWordDue(
        { ...baseMockWord, repetitions: 1, lastReviewedAt: '2026-10-09', dueDate: '2026-10-10' },
        now
      )
    ).toBe(true)

    // Legacy word due in 3 days: not due yet
    expect(
      isWordDue(
        { ...baseMockWord, repetitions: 1, lastReviewedAt: '2026-10-10', dueDate: '2026-10-14' },
        now
      )
    ).toBe(false)
  })

  it('filters due vocabulary and calculates stats accurately', () => {
    const now = new Date('2026-10-11T12:00:00Z')
    const list: VocabularyItem[] = [
      { ...baseMockWord, id: '1', state: 0, due: '2026-10-11T12:00:00.000Z' }, // new -> due
      {
        ...baseMockWord,
        id: '2',
        state: 2,
        reps: 1,
        due: '2026-10-11T10:00:00.000Z',
        last_review: '2026-10-10T10:00:00.000Z',
      }, // overdue review -> due first
      {
        ...baseMockWord,
        id: '3',
        state: 2,
        reps: 2,
        due: '2026-10-15T12:00:00.000Z',
        last_review: '2026-10-10T12:00:00.000Z',
      }, // future -> not due
      {
        ...baseMockWord,
        id: '4',
        mastered: true,
      }, // mastered -> not due
    ]

    const dueList = getDueVocabulary(list, now)
    expect(dueList.map((x) => x.id)).toEqual(['2', '1'])

    const stats = getSRSStats(list, now)
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
    expect(masteredWord.scheduled_days).toBe(30)
    expect(masteredWord.stability).toBeGreaterThanOrEqual(30)
    expect(masteredWord.dueDate).toBe('2026-11-10')

    const unmastered = toggleWordMastered(masteredWord, false, now)
    expect(unmastered.mastered).toBe(false)
    expect(unmastered.state).toBe(3)
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
