import { Hono } from 'hono'
import type { D1Database, Env, Variables } from '../types'
import { scoreDictation } from '../../src/lib/scoring/scorer'
import {
  applyWordOutcomesToMap,
  buildAdaptiveLessonBlueprint,
  extractWordOutcomesFromAlignment,
  RECENT_LESSONS_WINDOW,
  type AdaptiveLessonScoreEntry,
  type AdaptiveWordEntry,
  type WordOutcomeInput,
} from '../../src/lib/adaptive/adaptiveEngine'

export const adaptiveRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

interface WordMemoryRow {
  word: string
  miss_count: number
  wrong_count: number
  correct_count: number
  consecutive_correct: number
  ending_s_count: number | null
  last_ending_s_input: string | null
  last_error_type: string | null
  last_wrong_input: string | null
  status: string
  last_seen_at: string
  updated_at: string
}

interface RecentLessonRow {
  lessonId: string
  lessonTitle: string | null
  firstAttemptAvg: number
  gradedSegments: number
  lastGradedAt: string
}

function mapRowToWordEntry(row: WordMemoryRow): AdaptiveWordEntry {
  return {
    word: row.word,
    missCount: Number(row.miss_count || 0),
    wrongCount: Number(row.wrong_count || 0),
    correctCount: Number(row.correct_count || 0),
    consecutiveCorrect: Number(row.consecutive_correct || 0),
    endingSCount: Number(row.ending_s_count || 0),
    lastEndingSInput: row.last_ending_s_input || null,
    lastErrorType:
      row.last_error_type === 'missing' || row.last_error_type === 'incorrect'
        ? row.last_error_type
        : null,
    lastWrongInput: row.last_wrong_input || null,
    status:
      row.status === 'weak' || row.status === 'mastered' || row.status === 'learning'
        ? row.status
        : 'learning',
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Silently updates hidden adaptive word memory and lesson first-attempt history in D1
 * after a dictation attempt is recorded.
 */
export async function updateHiddenAdaptiveMemoryInD1(
  db: D1Database,
  params: {
    userId: string
    lessonId: string
    segmentId: string
    userInput: string
    expectedText?: string
    wordOutcomes?: WordOutcomeInput[]
    nowIso?: string
  }
): Promise<void> {
  const nowIso = params.nowIso || new Date().toISOString()

  let outcomes: WordOutcomeInput[] = params.wordOutcomes || []
  if (outcomes.length === 0) {
    let expectedText = params.expectedText?.trim() || ''
    if (!expectedText) {
      const seg = await db
        .prepare('SELECT text FROM transcript_segments WHERE id = ? AND user_id = ?')
        .bind(params.segmentId, params.userId)
        .first<{ text: string }>()
      expectedText = seg?.text?.trim() || ''
    }
    if (expectedText) {
      const scored = scoreDictation(expectedText, params.userInput)
      outcomes = extractWordOutcomesFromAlignment(scored.alignments)
    }
  }

  if (outcomes.length > 0) {
    const uniqueWords = Array.from(new Set(outcomes.map((o) => o.word).filter(Boolean)))
    const wordMap = new Map<string, AdaptiveWordEntry>()

    // Fetch existing states for touched words
    if (uniqueWords.length > 0) {
      const placeholders = uniqueWords.map(() => '?').join(', ')
      const { results } = await db
        .prepare(
          `SELECT word, miss_count, wrong_count, correct_count, consecutive_correct,
                  ending_s_count, last_ending_s_input,
                  last_error_type, last_wrong_input, status, last_seen_at, updated_at
           FROM adaptive_word_memory
           WHERE user_id = ? AND word IN (${placeholders})`
        )
        .bind(params.userId, ...uniqueWords)
        .all<WordMemoryRow>()

      for (const row of results || []) {
        wordMap.set(row.word, mapRowToWordEntry(row))
      }
    }

    const updatedEntries = applyWordOutcomesToMap(wordMap, outcomes, nowIso)
    if (updatedEntries.length > 0) {
      const stmts = updatedEntries.map((entry) =>
        db
          .prepare(
            `INSERT INTO adaptive_word_memory (
              user_id, word, miss_count, wrong_count, correct_count, consecutive_correct,
              ending_s_count, last_ending_s_input,
              last_error_type, last_wrong_input, status, last_seen_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, word) DO UPDATE SET
              miss_count = excluded.miss_count,
              wrong_count = excluded.wrong_count,
              correct_count = excluded.correct_count,
              consecutive_correct = excluded.consecutive_correct,
              ending_s_count = excluded.ending_s_count,
              last_ending_s_input = excluded.last_ending_s_input,
              last_error_type = excluded.last_error_type,
              last_wrong_input = excluded.last_wrong_input,
              status = excluded.status,
              last_seen_at = excluded.last_seen_at,
              updated_at = excluded.updated_at`
          )
          .bind(
            params.userId,
            entry.word,
            entry.missCount,
            entry.wrongCount,
            entry.correctCount,
            entry.consecutiveCorrect,
            entry.endingSCount,
            entry.lastEndingSInput,
            entry.lastErrorType,
            entry.lastWrongInput,
            entry.status,
            entry.lastSeenAt,
            entry.updatedAt
          )
      )
      await db.batch(stmts)
    }
  }

  // Recompute this lesson's first-attempt average silently
  const lessonStat = await db
    .prepare(
      `SELECT
         ROUND(AVG(score), 1) as firstAttemptAvg,
         COUNT(*) as gradedSegments,
         MAX(created_at) as lastGradedAt
       FROM (
         SELECT segment_id, score, created_at,
                ROW_NUMBER() OVER (PARTITION BY segment_id ORDER BY created_at ASC, rowid ASC) as rn
         FROM dictation_attempts
         WHERE user_id = ? AND lesson_id = ?
       )
       WHERE rn = 1`
    )
    .bind(params.userId, params.lessonId)
    .first<{ firstAttemptAvg: number | null; gradedSegments: number; lastGradedAt: string | null }>()

  if (lessonStat && lessonStat.gradedSegments > 0) {
    const lessonRow = await db
      .prepare('SELECT title FROM lessons WHERE id = ? AND user_id = ?')
      .bind(params.lessonId, params.userId)
      .first<{ title: string }>()

    await db
      .prepare(
        `INSERT INTO adaptive_lesson_history (
          user_id, lesson_id, lesson_title, first_attempt_avg, graded_segments, last_graded_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, lesson_id) DO UPDATE SET
          lesson_title = COALESCE(excluded.lesson_title, adaptive_lesson_history.lesson_title),
          first_attempt_avg = excluded.first_attempt_avg,
          graded_segments = excluded.graded_segments,
          last_graded_at = excluded.last_graded_at,
          updated_at = excluded.updated_at`
      )
      .bind(
        params.userId,
        params.lessonId,
        lessonRow?.title || params.lessonId,
        Number(lessonStat.firstAttemptAvg ?? 0),
        Number(lessonStat.gradedSegments || 0),
        lessonStat.lastGradedAt || nowIso,
        nowIso
      )
      .run()
  }
}

// GET /profile - Retrieve hidden adaptive profile & next-lesson generation blueprint (85% target)
adaptiveRouter.get('/profile', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const { results: wordRows } = await db
      .prepare(
        `SELECT word, miss_count, wrong_count, correct_count, consecutive_correct,
                ending_s_count, last_ending_s_input,
                last_error_type, last_wrong_input, status, last_seen_at, updated_at
         FROM adaptive_word_memory
         WHERE user_id = ?`
      )
      .bind(userId)
      .all<WordMemoryRow>()

    // Always compute latest 5 lessons directly from dictation_attempts first-attempts
    const { results: recentRows } = await db
      .prepare(
        `SELECT
           fa.lesson_id as lessonId,
           COALESCE(l.title, fa.lesson_id) as lessonTitle,
           ROUND(AVG(fa.score), 1) as firstAttemptAvg,
           COUNT(*) as gradedSegments,
           MAX(fa.created_at) as lastGradedAt
         FROM (
           SELECT lesson_id, segment_id, score, created_at,
                  ROW_NUMBER() OVER (PARTITION BY lesson_id, segment_id ORDER BY created_at ASC, rowid ASC) as rn
           FROM dictation_attempts
           WHERE user_id = ?
         ) fa
         LEFT JOIN lessons l ON l.id = fa.lesson_id AND l.user_id = ?
         WHERE fa.rn = 1
         GROUP BY fa.lesson_id
         ORDER BY MAX(fa.created_at) DESC
         LIMIT ?`
      )
      .bind(userId, userId, RECENT_LESSONS_WINDOW)
      .all<RecentLessonRow>()

    const words = (wordRows || []).map(mapRowToWordEntry)
    const recentLessons: AdaptiveLessonScoreEntry[] = (recentRows || []).map((r) => ({
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle || r.lessonId,
      firstAttemptAvg: Number(r.firstAttemptAvg || 0),
      gradedSegments: Number(r.gradedSegments || 0),
      lastGradedAt: r.lastGradedAt,
    }))

    const blueprint = buildAdaptiveLessonBlueprint(words, recentLessons)

    return c.json({
      success: true,
      data: blueprint,
    })
  } catch (err) {
    console.error('[API adaptive:profile error]', err)
    return c.json({ success: false, error: 'Failed to retrieve adaptive profile' }, 500)
  }
})

// POST /backfill - Rebuild hidden adaptive memory strictly from FIRST-ATTEMPT dictation_attempts per (lesson, segment)
adaptiveRouter.post('/backfill', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const { results: attempts } = await db
      .prepare(
        `SELECT lessonId, segmentId, userInput, createdAt, expectedText
         FROM (
           SELECT da.lesson_id as lessonId,
                  da.segment_id as segmentId,
                  da.user_input as userInput,
                  da.created_at as createdAt,
                  ts.text as expectedText,
                  ROW_NUMBER() OVER (
                    PARTITION BY da.lesson_id, da.segment_id
                    ORDER BY da.created_at ASC, da.rowid ASC
                  ) as rn
           FROM dictation_attempts da
           INNER JOIN transcript_segments ts ON ts.id = da.segment_id AND ts.user_id = da.user_id
           WHERE da.user_id = ? AND LENGTH(TRIM(ts.text)) > 0
         )
         WHERE rn = 1
         ORDER BY createdAt ASC`
      )
      .bind(userId)
      .all<{
        lessonId: string
        segmentId: string
        userInput: string
        createdAt: string
        expectedText: string
      }>()

    const wordMap = new Map<string, AdaptiveWordEntry>()
    let processedAttempts = 0

    for (const att of attempts || []) {
      const scored = scoreDictation(att.expectedText, att.userInput)
      const outcomes = extractWordOutcomesFromAlignment(scored.alignments)
      applyWordOutcomesToMap(wordMap, outcomes, att.createdAt)
      processedAttempts++
    }

    // Replace existing adaptive_word_memory for this user cleanly
    await db.prepare('DELETE FROM adaptive_word_memory WHERE user_id = ?').bind(userId).run()

    const allWords = Array.from(wordMap.values())
    const CHUNK_SIZE = 50
    for (let i = 0; i < allWords.length; i += CHUNK_SIZE) {
      const slice = allWords.slice(i, i + CHUNK_SIZE)
      await db.batch(
        slice.map((entry) =>
          db
            .prepare(
              `INSERT INTO adaptive_word_memory (
                user_id, word, miss_count, wrong_count, correct_count, consecutive_correct,
                ending_s_count, last_ending_s_input,
                last_error_type, last_wrong_input, status, last_seen_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              userId,
              entry.word,
              entry.missCount,
              entry.wrongCount,
              entry.correctCount,
              entry.consecutiveCorrect,
              entry.endingSCount,
              entry.lastEndingSInput,
              entry.lastErrorType,
              entry.lastWrongInput,
              entry.status,
              entry.lastSeenAt,
              entry.updatedAt
            )
        )
      )
    }

    // Refresh adaptive_lesson_history from first-attempts
    const { results: lessonStats } = await db
      .prepare(
        `SELECT
           fa.lesson_id as lessonId,
           COALESCE(l.title, fa.lesson_id) as lessonTitle,
           ROUND(AVG(fa.score), 1) as firstAttemptAvg,
           COUNT(*) as gradedSegments,
           MAX(fa.created_at) as lastGradedAt
         FROM (
           SELECT lesson_id, segment_id, score, created_at,
                  ROW_NUMBER() OVER (PARTITION BY lesson_id, segment_id ORDER BY created_at ASC, rowid ASC) as rn
           FROM dictation_attempts
           WHERE user_id = ?
         ) fa
         LEFT JOIN lessons l ON l.id = fa.lesson_id AND l.user_id = ?
         WHERE fa.rn = 1
         GROUP BY fa.lesson_id
         ORDER BY MAX(fa.created_at) DESC`
      )
      .bind(userId, userId)
      .all<RecentLessonRow>()

    await db.prepare('DELETE FROM adaptive_lesson_history WHERE user_id = ?').bind(userId).run()

    const nowIso = new Date().toISOString()
    const historyEntries: AdaptiveLessonScoreEntry[] = (lessonStats || []).map((r) => ({
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle || r.lessonId,
      firstAttemptAvg: Number(r.firstAttemptAvg || 0),
      gradedSegments: Number(r.gradedSegments || 0),
      lastGradedAt: r.lastGradedAt,
    }))

    if (historyEntries.length > 0) {
      await db.batch(
        historyEntries.map((h) =>
          db
            .prepare(
              `INSERT INTO adaptive_lesson_history (
                user_id, lesson_id, lesson_title, first_attempt_avg, graded_segments, last_graded_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              userId,
              h.lessonId,
              h.lessonTitle,
              h.firstAttemptAvg,
              h.gradedSegments,
              h.lastGradedAt,
              nowIso
            )
        )
      )
    }

    const blueprint = buildAdaptiveLessonBlueprint(allWords, historyEntries)
    return c.json({
      success: true,
      data: {
        processedAttempts,
        trackedWords: allWords.length,
        weakWordsCount: blueprint.weakWords.length,
        masteredWordsCount: blueprint.masteredWords.length,
        endingSErrorsTotal: blueprint.endingSTraining.totalEndingSErrors,
        endingSAffectedWords: blueprint.endingSTraining.affectedWordsCount,
        recentLessonsCount: blueprint.recentLessons.length,
        directive: blueprint.directive,
      },
    })
  } catch (err) {
    console.error('[API adaptive:backfill error]', err)
    return c.json({ success: false, error: 'Failed to backfill adaptive memory' }, 500)
  }
})
