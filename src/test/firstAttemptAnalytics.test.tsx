import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { app } from '../../server'
import { createTestD1Database } from '../../server/test/d1-sqlite'
import type { D1Database } from '../../server/types'
import {
  computeFirstAttemptAnalytics,
  extractLocalFirstAttempts,
  mergeFirstAttemptRecords,
} from '../lib/progress/firstAttemptAnalytics'
import { ProgressView } from '../features/progress/ProgressView'
import type { FirstAttemptRecord, Lesson, UserLessonProgress } from '../types'

describe('First-Attempt Score Progress Analytics (Weekly & Monthly)', () => {
  it('computes weekly and monthly first-attempt averages and period-over-period deltas', () => {
    const records: FirstAttemptRecord[] = [
      // Week 46 (Nov 9-15, 2026) -> avg 70%
      { lessonId: 'l1', segmentId: 's1', score: 60, createdAt: '2026-11-10T10:00:00Z' },
      { lessonId: 'l1', segmentId: 's2', score: 80, createdAt: '2026-11-12T10:00:00Z' },
      // Week 47 (Nov 16-22, 2026) -> avg 85% (+15% vs Week 46)
      { lessonId: 'l2', segmentId: 's3', score: 80, createdAt: '2026-11-17T10:00:00Z' },
      { lessonId: 'l2', segmentId: 's4', score: 90, createdAt: '2026-11-19T10:00:00Z' },
      // Previous month (Oct 2026) -> avg 65%
      { lessonId: 'l0', segmentId: 's0', score: 65, createdAt: '2026-10-20 08:00:00' },
    ]

    const weekly = computeFirstAttemptAnalytics(records, 'weekly')
    expect(weekly.totalCount).toBe(5)
    expect(weekly.overallAvg).toBe(75)
    expect(weekly.currentPeriod?.avgScore).toBe(85)
    expect(weekly.previousPeriod?.avgScore).toBe(70)
    expect(weekly.delta).toBe(15)

    const monthly = computeFirstAttemptAnalytics(records, 'monthly')
    expect(monthly.periods).toHaveLength(2)
    expect(monthly.previousPeriod?.avgScore).toBe(65) // Oct 2026
    expect(monthly.currentPeriod?.avgScore).toBe(77.5) // Nov 2026: (60+80+80+90)/4 = 77.5
    expect(monthly.delta).toBe(12.5)
  })

  it('merges local and cloud first-attempt records keeping the earliest attempt per sentence', () => {
    const localMap: Record<string, UserLessonProgress> = {
      l1: {
        lessonId: 'l1',
        lastSentenceId: 's1',
        updatedAt: '2026-11-22T10:00:00Z',
        sentenceProgress: {
          s1: {
            sentenceId: 's1',
            userInput: 'retry text',
            score: 100,
            firstAttemptScore: 70,
            firstAttemptAt: '2026-11-20T09:00:00Z',
            isRevealed: true,
            attempts: 3,
            completed: true,
            lastAttemptAt: '2026-11-22T10:00:00Z',
          },
        },
      },
    }

    const local = extractLocalFirstAttempts(localMap)
    expect(local).toHaveLength(1)
    expect(local[0].score).toBe(70)

    const cloud: FirstAttemptRecord[] = [
      { lessonId: 'l1', segmentId: 's1', score: 65, createdAt: '2026-11-19T08:00:00Z' },
      { lessonId: 'l1', segmentId: 's2', score: 90, createdAt: '2026-11-21T08:00:00Z' },
    ]

    const merged = mergeFirstAttemptRecords(local, cloud)
    expect(merged).toHaveLength(2)
    // Earliest timestamp wins for (l1, s1) -> 65
    expect(merged.find((r) => r.segmentId === 's1')?.score).toBe(65)
    expect(merged.find((r) => r.segmentId === 's2')?.score).toBe(90)
  })

  describe('GET /api/attempts/first-attempt-stats D1 endpoint', () => {
    let db: D1Database

    beforeEach(() => {
      db = createTestD1Database(false)
    })

    it('returns strictly the first attempt score per (lesson, segment) even after multiple retries', async () => {
      const postAttempt = (lessonId: string, segmentId: string, score: number) =>
        app.request(
          '/api/attempts',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-user-id': 'owner' },
            body: JSON.stringify({
              lessonId,
              segmentId,
              userInput: 'test',
              score,
              accuracy: score / 100,
            }),
          },
          { DB: db }
        )

      // Sentence 1: first attempt 62%, then retried to 88%, then 100%
      await postAttempt('lesson-1', 'seg-1', 62)
      await postAttempt('lesson-1', 'seg-1', 88)
      await postAttempt('lesson-1', 'seg-1', 100)

      // Sentence 2: first attempt 94%
      await postAttempt('lesson-1', 'seg-2', 94)

      const res = await app.request(
        '/api/attempts/first-attempt-stats',
        { headers: { 'x-user-id': 'owner' } },
        { DB: db }
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; data: FirstAttemptRecord[] }
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
      expect(json.data.find((r) => r.segmentId === 'seg-1')?.score).toBe(62)
      expect(json.data.find((r) => r.segmentId === 'seg-2')?.score).toBe(94)
    })
  })

  it('renders weekly/monthly first-attempt comparison in ProgressView', () => {
    const lessons: Lesson[] = [
      {
        id: 'l1',
        videoId: 'v1',
        title: 'Lesson 1',
        description: '',
        language: 'en',
        level: 'Intermediate',
        sentences: [
          { id: 's1', startTime: 0, endTime: 5, text: 'Hello world' },
          { id: 's2', startTime: 5, endTime: 10, text: 'Good morning' },
        ],
      },
    ]

    const progressMap: Record<string, UserLessonProgress> = {
      l1: {
        lessonId: 'l1',
        lastSentenceId: 's2',
        updatedAt: '2026-11-20T10:00:00Z',
        sentenceProgress: {
          s1: {
            sentenceId: 's1',
            userInput: 'Hello world',
            score: 100,
            firstAttemptScore: 70,
            firstAttemptAt: '2026-10-15T10:00:00Z',
            isRevealed: true,
            attempts: 2,
            completed: true,
            lastAttemptAt: '2026-10-15T10:05:00Z',
          },
          s2: {
            sentenceId: 's2',
            userInput: 'Good morning',
            score: 100,
            firstAttemptScore: 90,
            firstAttemptAt: '2026-11-20T10:00:00Z',
            isRevealed: true,
            attempts: 1,
            completed: true,
            lastAttemptAt: '2026-11-20T10:00:00Z',
          },
        },
      },
    }

    render(
      <ProgressView
        lessons={lessons}
        allProgressMap={progressMap}
        onResetAllProgress={() => {}}
        onNavigateToPractice={() => {}}
      />
    )

    expect(screen.getByText(/Tiến bộ điểm chấm lần đầu/i)).toBeInTheDocument()
    expect(screen.getAllByText('+20%').length).toBeGreaterThan(0)

    const monthlyBtn = screen.getByRole('button', { name: /Hàng tháng/i })
    fireEvent.click(monthlyBtn)
    expect(monthlyBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText(/Tháng 10/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Tháng 11/i).length).toBeGreaterThan(0)
  })
})
