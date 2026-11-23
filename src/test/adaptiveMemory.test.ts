import { describe, it, expect, beforeEach } from 'vitest'
import { scoreDictation } from '../lib/scoring/scorer'
import {
  applyWordOutcomesToMap,
  buildAdaptiveLessonBlueprint,
  computeAdaptiveDirective,
  extractWordOutcomesFromAlignment,
  isTrailingSEndingError,
  type AdaptiveLessonScoreEntry,
  type AdaptiveWordEntry,
} from '../lib/adaptive/adaptiveEngine'
import { hiddenAdaptiveStore } from '../lib/adaptive/hiddenAdaptiveStore'
import { app as serverApp } from '../../server'
import { createTestD1Database } from '../../server/test/d1-sqlite'
import type { D1Database } from '../../server/types'

describe('Hidden Adaptive Learning Database & 85% Difficulty Controller', () => {
  beforeEach(() => {
    hiddenAdaptiveStore.clear()
  })

  it('tracks Weak Words on missing/incorrect and promotes to Mastered after 3 consecutive correct', () => {
    const wordMap = new Map<string, AdaptiveWordEntry>()

    // 1. User misses "latency" and misspells "throughput" as "truput", gets "server" right
    const s1 = scoreDictation('Check server latency and throughput now.', 'Check server and truput now.')
    applyWordOutcomesToMap(wordMap, extractWordOutcomesFromAlignment(s1.alignments), '2026-11-20T10:00:00Z')

    expect(wordMap.get('latency')?.status).toBe('weak')
    expect(wordMap.get('latency')?.missCount).toBe(1)
    expect(wordMap.get('latency')?.consecutiveCorrect).toBe(0)

    expect(wordMap.get('throughput')?.status).toBe('weak')
    expect(wordMap.get('throughput')?.wrongCount).toBe(1)
    expect(wordMap.get('throughput')?.lastWrongInput).toBe('truput')

    expect(wordMap.get('server')?.status).toBe('learning')
    expect(wordMap.get('server')?.consecutiveCorrect).toBe(1)

    // 2. User hears "server" and "latency" right twice more
    const s2 = scoreDictation('server latency', 'server latency')
    applyWordOutcomesToMap(wordMap, extractWordOutcomesFromAlignment(s2.alignments), '2026-11-21T10:00:00Z')
    applyWordOutcomesToMap(wordMap, extractWordOutcomesFromAlignment(s2.alignments), '2026-11-22T10:00:00Z')

    // "server" hit 3 consecutive correct -> Mastered!
    expect(wordMap.get('server')?.consecutiveCorrect).toBe(3)
    expect(wordMap.get('server')?.status).toBe('mastered')

    // "latency" only has 2 consecutive correct so far -> still Weak until hitting 3!
    expect(wordMap.get('latency')?.consecutiveCorrect).toBe(2)
    expect(wordMap.get('latency')?.status).toBe('weak')

    // 3. One more correct for "latency" -> reaches 3 consecutive -> promoted to Mastered!
    applyWordOutcomesToMap(wordMap, [{ word: 'latency', outcome: 'correct' }], '2026-11-23T10:00:00Z')
    expect(wordMap.get('latency')?.consecutiveCorrect).toBe(3)
    expect(wordMap.get('latency')?.status).toBe('mastered')

    // 4. If user later misses a mastered word ("server"), it resets streak and returns to Weak
    applyWordOutcomesToMap(wordMap, [{ word: 'server', outcome: 'missing' }], '2026-11-24T10:00:00Z')
    expect(wordMap.get('server')?.consecutiveCorrect).toBe(0)
    expect(wordMap.get('server')?.status).toBe('weak')
  })

  it('classifies missing/extra trailing -s/-es/-ies/\'s as ending_s sound errors, NOT weak vocabulary words', () => {
    // True trailing -s ending errors
    expect(isTrailingSEndingError('servers', 'server')).toBe(true)
    expect(isTrailingSEndingError('patches', 'patch')).toBe(true)
    expect(isTrailingSEndingError('queries', 'query')).toBe(true)
    expect(isTrailingSEndingError("system's", 'system')).toBe(true)
    expect(isTrailingSEndingError('server', 'servers')).toBe(true)

    // Genuine non-ending-s errors (must NOT be misclassified)
    expect(isTrailingSEndingError('his', 'hi')).toBe(false)
    expect(isTrailingSEndingError('was', 'wa')).toBe(false)
    expect(isTrailingSEndingError('latency', 'later')).toBe(false)
    expect(isTrailingSEndingError('is', 'i')).toBe(false)

    const wordMap = new Map<string, AdaptiveWordEntry>()
    const scored = scoreDictation(
      'Three servers deploy patches and queries for throughput.',
      'Three server deploy patch and query for truput.'
    )
    applyWordOutcomesToMap(
      wordMap,
      extractWordOutcomesFromAlignment(scored.alignments),
      '2026-11-23T14:00:00Z'
    )

    // "servers", "patches", "queries" were ONLY missing trailing -s -> tracked under endingSCount, NOT weak!
    expect(wordMap.get('servers')?.status).not.toBe('weak')
    expect(wordMap.get('servers')?.endingSCount).toBe(1)
    expect(wordMap.get('servers')?.lastEndingSInput).toBe('server')
    expect(wordMap.get('patches')?.status).not.toBe('weak')
    expect(wordMap.get('patches')?.endingSCount).toBe(1)
    expect(wordMap.get('queries')?.status).not.toBe('weak')
    expect(wordMap.get('queries')?.endingSCount).toBe(1)

    // "throughput" -> "truput" IS a genuine weak word!
    expect(wordMap.get('throughput')?.status).toBe('weak')
    expect(wordMap.get('throughput')?.wrongCount).toBe(1)

    const bp = buildAdaptiveLessonBlueprint(Array.from(wordMap.values()), [])
    expect(bp.weakWords.map((w) => w.word)).toEqual(['throughput'])
    expect(bp.endingSTraining.totalEndingSErrors).toBe(3)
    expect(bp.endingSTraining.affectedWordsCount).toBe(3)
    expect(bp.endingSTraining.needsDrill).toBe(true)
  })

  it('adjusts next-lesson difficulty around 85% target (<80% decrease, 80-90% maintain, >90% increase) using last 5 lessons', () => {
    const makeLessons = (scores: number[]): AdaptiveLessonScoreEntry[] =>
      scores.map((score, i) => ({
        lessonId: `lesson-${i + 1}`,
        lessonTitle: `Lesson ${i + 1}`,
        firstAttemptAvg: score,
        gradedSegments: 10,
        lastGradedAt: `2026-11-${String(20 - i).padStart(2, '0')}T10:00:00Z`,
      }))

    // Below 80% -> decrease difficulty
    const low = computeAdaptiveDirective(makeLessons([72, 78, 75, 79, 76]))
    expect(low.action).toBe('decrease')
    expect(low.referenceScore).toBe(76)
    expect(low.rules.vocabularyLevel).toBe('familiar')
    expect(low.rules.connectedSpeech).toBe('minimal')

    // Between 80% and 90% -> maintain current difficulty
    const mid = computeAdaptiveDirective(makeLessons([84, 86, 82, 88, 85]))
    expect(mid.action).toBe('maintain')
    expect(mid.referenceScore).toBe(85)
    expect(mid.rules.vocabularyLevel).toBe('current')

    // Above 90% -> increase difficulty
    const high = computeAdaptiveDirective(makeLessons([92, 95, 91, 94, 93]))
    expect(high.action).toBe('increase')
    expect(high.referenceScore).toBe(93)
    expect(high.rules.vocabularyLevel).toBe('elevated')
    expect(high.rules.idiomsAndCollocations).toBe(true)

    // Only the 5 most recent lessons count even if 7 are passed in
    const blueprint = buildAdaptiveLessonBlueprint([], makeLessons([95, 94, 92, 93, 91, 40, 30]))
    expect(blueprint.recentLessons).toHaveLength(5)
    expect(blueprint.directive.action).toBe('increase')
  })

  it('silently records graded checks in hiddenAdaptiveStore without displaying anything', () => {
    const res1 = scoreDictation('Restart the database replica immediately.', 'Restart the replica immediately.')
    hiddenAdaptiveStore.recordGradedCheck({
      lessonId: 'lesson-a',
      lessonTitle: 'Lesson A',
      segmentId: 'seg-1',
      score: res1.score,
      alignments: res1.alignments,
      isFirstAttempt: true,
      nowIso: '2026-11-23T10:00:00Z',
    })

    // Retry on same segment should NOT overwrite first-attempt score for Lesson A
    const resRetry = scoreDictation('Restart the database replica immediately.', 'Restart the database replica immediately.')
    hiddenAdaptiveStore.recordGradedCheck({
      lessonId: 'lesson-a',
      lessonTitle: 'Lesson A',
      segmentId: 'seg-1',
      score: resRetry.score,
      alignments: resRetry.alignments,
      isFirstAttempt: false,
      nowIso: '2026-11-23T10:01:00Z',
    })

    const bp = hiddenAdaptiveStore.getBlueprint()
    expect(bp.recentLessons).toHaveLength(1)
    expect(bp.recentLessons[0].firstAttemptAvg).toBe(res1.score)
    expect(bp.weakWords.some((w) => w.word === 'database')).toBe(true)
  })

  it('silently updates D1 adaptive tables on POST /api/attempts and supports GET /api/adaptive/profile & POST /api/adaptive/backfill', async () => {
    const db: D1Database = createTestD1Database(false)
    const user = 'adaptive-test-user'

    // 1. Create a lesson with 3 segments
    const createLessonRes = await serverApp.request(
      '/api/lessons',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': user },
        body: JSON.stringify({
          id: 'lesson-adapt-1',
          videoId: 'audio-adapt-1',
          title: 'Adaptive Test Dialogue',
          sentences: [
            { id: 'seg-a1', startTime: 0, endTime: 4, text: 'Monitor firewall failover immediately.' },
            { id: 'seg-a2', startTime: 4, endTime: 8, text: 'Check firewall logs quickly.' },
            { id: 'seg-a3', startTime: 8, endTime: 12, text: 'Confirm firewall status now.' },
          ],
        }),
      },
      { DB: db }
    )
    expect(createLessonRes.status).toBe(201)

    // 2. Submit 3 graded attempts: "firewall" is heard right 3x in a row (Mastered!), "failover" is missed (Weak!)
    const attemptsPayload = [
      {
        segmentId: 'seg-a1',
        expectedText: 'Monitor firewall failover immediately.',
        userInput: 'Monitor firewall immediately.',
      },
      {
        segmentId: 'seg-a2',
        expectedText: 'Check firewall logs quickly.',
        userInput: 'Check firewall logs quickly.',
      },
      {
        segmentId: 'seg-a3',
        expectedText: 'Confirm firewall status now.',
        userInput: 'Confirm firewall status now.',
      },
    ]

    for (const att of attemptsPayload) {
      const scored = scoreDictation(att.expectedText, att.userInput)
      const res = await serverApp.request(
        '/api/attempts',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-user-id': user },
          body: JSON.stringify({
            lessonId: 'lesson-adapt-1',
            segmentId: att.segmentId,
            userInput: att.userInput,
            score: scored.score,
            accuracy: scored.accuracy,
            correctCount: scored.correctCount,
            missingCount: scored.missingCount,
            incorrectCount: scored.incorrectCount,
            extraCount: scored.extraCount,
            expectedText: att.expectedText,
            wordOutcomes: extractWordOutcomesFromAlignment(scored.alignments),
          }),
        },
        { DB: db }
      )
      expect(res.status).toBe(201)
    }

    // 3. Query hidden adaptive profile
    const profileRes = await serverApp.request(
      '/api/adaptive/profile',
      { method: 'GET', headers: { 'x-user-id': user } },
      { DB: db }
    )
    expect(profileRes.status).toBe(200)
    const profileJson = (await profileRes.json()) as {
      success: boolean
      data: {
        weakWords: AdaptiveWordEntry[]
        priorityWeakWords: AdaptiveWordEntry[]
        masteredWords: AdaptiveWordEntry[]
        recentLessons: AdaptiveLessonScoreEntry[]
        directive: { action: string; referenceScore: number }
      }
    }

    expect(profileJson.success).toBe(true)
    expect(profileJson.data.weakWords.some((w) => w.word === 'failover')).toBe(true)
    expect(profileJson.data.priorityWeakWords.some((w) => w.word === 'failover')).toBe(true)
    expect(profileJson.data.masteredWords.some((w) => w.word === 'firewall' && w.consecutiveCorrect === 3)).toBe(true)
    expect(profileJson.data.recentLessons).toHaveLength(1)
    expect(profileJson.data.recentLessons[0].firstAttemptAvg).toBeGreaterThan(90)
    expect(profileJson.data.directive.action).toBe('increase')

    // 4. Verify backfill produces identical results from historical dictation_attempts
    const backfillRes = await serverApp.request(
      '/api/adaptive/backfill',
      { method: 'POST', headers: { 'x-user-id': user } },
      { DB: db }
    )
    expect(backfillRes.status).toBe(200)
    const backfillJson = (await backfillRes.json()) as {
      success: boolean
      data: { processedAttempts: number; weakWordsCount: number; masteredWordsCount: number }
    }
    expect(backfillJson.success).toBe(true)
    expect(backfillJson.data.processedAttempts).toBe(3)
    expect(backfillJson.data.weakWordsCount).toBe(1)
    expect(backfillJson.data.masteredWordsCount).toBe(1)
  })
})
