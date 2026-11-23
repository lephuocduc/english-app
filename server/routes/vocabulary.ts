import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const vocabularyRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const reviewLogPayloadSchema = z.object({
  id: z.string().max(100).optional(),
  card_id: z.string().max(100).optional(),
  rating: z.number().int().min(1).max(4),
  state: z.number().int().min(0).max(3).default(0),
  due: z.string().max(50).nullable().optional(),
  stability: z.number().min(0).default(0),
  difficulty: z.number().min(0).max(10).default(0),
  elapsed_days: z.number().int().min(0).default(0),
  scheduled_days: z.number().int().min(0).default(0),
  learning_steps: z.number().int().min(0).default(0),
  review_time: z.string().max(50).optional(),
})

const saveVocabularySchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1, 'Word is required').max(100).trim(),
  meaning: z.string().max(500).optional(),
  contextSentence: z.string().max(1000).default(''),
  contextSentenceTranslation: z.string().max(1000).optional(),
  timestamp: z.number().min(0).default(0),
  videoId: z.string().max(64).default(''),
  lessonTitle: z.string().max(200).default(''),
  mastered: z.boolean().default(false),

  // Legacy SM-2 compatibility fields
  interval: z.number().min(0).optional(),
  easeFactor: z.number().min(1.0).default(2.5),
  repetitions: z.number().min(0).optional(),
  dueDate: z.string().max(50).optional(),
  lastReviewedAt: z.string().max(50).optional(),

  // FSRS (ts-fsrs) scheduling fields
  due: z.string().max(50).optional(),
  stability: z.number().min(0).default(0),
  difficulty: z.number().min(0).max(10).default(0),
  elapsed_days: z.number().int().min(0).default(0),
  scheduled_days: z.number().int().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  lapses: z.number().int().min(0).default(0),
  learning_steps: z.number().int().min(0).default(0),
  state: z.number().int().min(0).max(3).default(0),
  last_review: z.string().max(50).nullable().optional(),

  // Optional review log entry recorded alongside card update
  reviewLog: reviewLogPayloadSchema.optional(),
})

interface VocabRow {
  id: string
  word: string
  meaning: string | null
  contextSentence: string | null
  contextSentenceTranslation: string | null
  timestamp: number | null
  videoId: string | null
  lessonTitle: string | null
  savedAt: string
  mastered: number | null
  interval: number | null
  easeFactor: number | null
  repetitions: number | null
  dueDate: string | null
  lastReviewedAt: string | null
  due: string | null
  stability: number | null
  difficulty: number | null
  elapsed_days: number | null
  scheduled_days: number | null
  reps: number | null
  lapses: number | null
  learning_steps: number | null
  state: number | null
  last_review: string | null
}

interface ReviewLogRow {
  id: string
  card_id: string
  rating: number
  state: number
  due: string | null
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  review_time: string
}

function normalizeDueTimestamp(due?: string | null, dueDate?: string | null, fallbackIso?: string): string {
  if (due && due.trim()) return due.trim()
  if (dueDate && dueDate.trim()) {
    const trimmed = dueDate.trim()
    return trimmed.length === 10 ? `${trimmed}T00:00:00.000Z` : trimmed
  }
  return fallbackIso || new Date().toISOString()
}

// GET / - List saved vocabulary (supports ?dueOnly=true to fetch cards where due <= now)
vocabularyRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB
  const dueOnly = c.req.query('dueOnly') === 'true'
  const nowIso = new Date().toISOString()

  try {
    const sql = dueOnly
      ? `SELECT id, word, meaning,
                context_sentence as contextSentence,
                context_sentence_translation as contextSentenceTranslation,
                timestamp,
                video_id as videoId,
                lesson_title as lessonTitle,
                saved_at as savedAt,
                mastered,
                interval,
                ease_factor as easeFactor,
                repetitions,
                due_date as dueDate,
                last_reviewed_at as lastReviewedAt,
                due,
                stability,
                difficulty,
                elapsed_days,
                scheduled_days,
                reps,
                lapses,
                learning_steps,
                state,
                last_review
         FROM saved_vocabulary
         WHERE user_id = ? AND COALESCE(mastered, 0) = 0 AND (due IS NULL OR due <= ?)
         ORDER BY due ASC, saved_at DESC`
      : `SELECT id, word, meaning,
                context_sentence as contextSentence,
                context_sentence_translation as contextSentenceTranslation,
                timestamp,
                video_id as videoId,
                lesson_title as lessonTitle,
                saved_at as savedAt,
                mastered,
                interval,
                ease_factor as easeFactor,
                repetitions,
                due_date as dueDate,
                last_reviewed_at as lastReviewedAt,
                due,
                stability,
                difficulty,
                elapsed_days,
                scheduled_days,
                reps,
                lapses,
                learning_steps,
                state,
                last_review
         FROM saved_vocabulary
         WHERE user_id = ?
         ORDER BY saved_at DESC`

    const stmt = dueOnly ? db.prepare(sql).bind(userId, nowIso) : db.prepare(sql).bind(userId)
    const { results } = await stmt.all<VocabRow>()

    const data = (results || []).map((row) => {
      const scheduledDays = Number(row.scheduled_days ?? row.interval ?? 0)
      const reps = Number(row.reps ?? row.repetitions ?? 0)
      const due = normalizeDueTimestamp(row.due, row.dueDate, row.savedAt)
      const lastReview = row.last_review ?? row.lastReviewedAt ?? null
      return {
        ...row,
        mastered: Boolean(row.mastered),
        interval: scheduledDays,
        repetitions: reps,
        easeFactor: Number(row.easeFactor ?? 2.5),
        dueDate: row.dueDate || due.slice(0, 10),
        lastReviewedAt: lastReview || undefined,
        due,
        stability: Number(row.stability ?? 0),
        difficulty: Number(row.difficulty ?? 0),
        elapsed_days: Number(row.elapsed_days ?? 0),
        scheduled_days: scheduledDays,
        reps,
        lapses: Number(row.lapses ?? 0),
        learning_steps: Number(row.learning_steps ?? 0),
        state: Number(row.state ?? (reps > 0 ? 2 : 0)),
        last_review: lastReview,
      }
    })

    return c.json({
      success: true,
      data,
    })
  } catch (err) {
    console.error('[API vocabulary:list error]', err)
    return c.json({ success: false, error: 'Failed to retrieve saved vocabulary' }, 500)
  }
})

// GET /review-logs - Retrieve FSRS review logs for analytics & future parameter optimization
vocabularyRouter.get('/review-logs', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB
  const cardId = c.req.query('cardId')?.trim()
  const rawLimit = Number(c.req.query('limit') || 500)
  const limit = Number.isFinite(rawLimit) ? Math.min(2000, Math.max(1, Math.floor(rawLimit))) : 500

  try {
    const stmt = cardId
      ? db
          .prepare(
            `SELECT id, card_id, rating, state, due, stability, difficulty,
                    elapsed_days, scheduled_days, learning_steps, review_time
             FROM review_logs
             WHERE user_id = ? AND card_id = ?
             ORDER BY review_time DESC
             LIMIT ?`
          )
          .bind(userId, cardId, limit)
      : db
          .prepare(
            `SELECT id, card_id, rating, state, due, stability, difficulty,
                    elapsed_days, scheduled_days, learning_steps, review_time
             FROM review_logs
             WHERE user_id = ?
             ORDER BY review_time DESC
             LIMIT ?`
          )
          .bind(userId, limit)

    const { results } = await stmt.all<ReviewLogRow>()
    return c.json({
      success: true,
      data: results || [],
    })
  } catch (err) {
    console.error('[API vocabulary:review-logs:list error]', err)
    return c.json({ success: false, error: 'Failed to retrieve review logs' }, 500)
  }
})

// POST /review-logs - Insert a standalone FSRS review log entry
vocabularyRouter.post('/review-logs', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parsed = reviewLogPayloadSchema.extend({ card_id: z.string().min(1).max(100) }).safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      400
    )
  }

  const log = parsed.data
  const id = log.id || `revlog-${crypto.randomUUID()}`
  const reviewTime = log.review_time || new Date().toISOString()

  try {
    await db
      .prepare(
        `INSERT INTO review_logs (
          id, user_id, card_id, rating, state, due, stability, difficulty,
          elapsed_days, scheduled_days, learning_steps, review_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        log.card_id,
        log.rating,
        log.state,
        log.due || null,
        log.stability,
        log.difficulty,
        log.elapsed_days,
        log.scheduled_days,
        log.learning_steps,
        reviewTime
      )
      .run()

    return c.json(
      {
        success: true,
        data: {
          id,
          card_id: log.card_id,
          rating: log.rating,
          state: log.state,
          due: log.due || null,
          stability: log.stability,
          difficulty: log.difficulty,
          elapsed_days: log.elapsed_days,
          scheduled_days: log.scheduled_days,
          learning_steps: log.learning_steps,
          review_time: reviewTime,
        },
      },
      201
    )
  } catch (err) {
    console.error('[API vocabulary:review-logs:create error]', err)
    return c.json({ success: false, error: 'Failed to record review log' }, 500)
  }
})

// POST / - Save or update a vocabulary item with FSRS state (and optional review_log entry)
vocabularyRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parseResult = saveVocabularySchema.safeParse(body)
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      },
      400
    )
  }

  const data = parseResult.data
  let vocabId = data.id

  const nowIso = new Date().toISOString()
  const scheduledDays = data.scheduled_days ?? data.interval ?? 0
  const reps = data.reps ?? data.repetitions ?? 0
  const due = normalizeDueTimestamp(data.due, data.dueDate, nowIso)
  const dueDate = data.dueDate || due.slice(0, 10)
  const lastReview = data.last_review !== undefined ? data.last_review : (data.lastReviewedAt || null)

  try {
    // Look up by word for this user to reuse existing row ID and prevent duplicate words in D1
    const existing = await db
      .prepare('SELECT id FROM saved_vocabulary WHERE LOWER(word) = LOWER(?) AND user_id = ?')
      .bind(data.word.trim(), userId)
      .first<{ id: string }>()

    if (existing) {
      vocabId = existing.id
    } else if (!vocabId) {
      vocabId = `vocab-${crypto.randomUUID()}`
    }

    // Parameterized upsert including all FSRS fields
    await db
      .prepare(
        `INSERT INTO saved_vocabulary (
          id, user_id, word, meaning, context_sentence, context_sentence_translation,
          timestamp, video_id, lesson_title, saved_at,
          mastered, interval, ease_factor, repetitions, due_date, last_reviewed_at,
          due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, learning_steps, state, last_review
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          word = excluded.word,
          meaning = COALESCE(excluded.meaning, saved_vocabulary.meaning),
          context_sentence = excluded.context_sentence,
          context_sentence_translation = COALESCE(excluded.context_sentence_translation, saved_vocabulary.context_sentence_translation),
          timestamp = excluded.timestamp,
          video_id = excluded.video_id,
          lesson_title = excluded.lesson_title,
          mastered = excluded.mastered,
          interval = excluded.interval,
          ease_factor = excluded.ease_factor,
          repetitions = excluded.repetitions,
          due_date = excluded.due_date,
          last_reviewed_at = excluded.last_reviewed_at,
          due = excluded.due,
          stability = excluded.stability,
          difficulty = excluded.difficulty,
          elapsed_days = excluded.elapsed_days,
          scheduled_days = excluded.scheduled_days,
          reps = excluded.reps,
          lapses = excluded.lapses,
          learning_steps = excluded.learning_steps,
          state = excluded.state,
          last_review = excluded.last_review`
      )
      .bind(
        vocabId,
        userId,
        data.word,
        data.meaning || null,
        data.contextSentence,
        data.contextSentenceTranslation || null,
        data.timestamp,
        data.videoId,
        data.lessonTitle,
        data.mastered ? 1 : 0,
        scheduledDays,
        data.easeFactor,
        reps,
        dueDate,
        lastReview,
        due,
        data.stability,
        data.difficulty,
        data.elapsed_days,
        scheduledDays,
        reps,
        data.lapses,
        data.learning_steps,
        data.state,
        lastReview
      )
      .run()

    // Persist review log entry if provided with this review action
    if (data.reviewLog) {
      const log = data.reviewLog
      const logId = log.id || `revlog-${crypto.randomUUID()}`
      const reviewTime = log.review_time || lastReview || nowIso
      await db
        .prepare(
          `INSERT INTO review_logs (
            id, user_id, card_id, rating, state, due, stability, difficulty,
            elapsed_days, scheduled_days, learning_steps, review_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          logId,
          userId,
          vocabId,
          log.rating,
          log.state,
          log.due || due,
          log.stability,
          log.difficulty,
          log.elapsed_days,
          log.scheduled_days,
          log.learning_steps,
          reviewTime
        )
        .run()
    }

    return c.json(
      {
        success: true,
        data: {
          id: vocabId,
          word: data.word,
          meaning: data.meaning,
          contextSentence: data.contextSentence,
          contextSentenceTranslation: data.contextSentenceTranslation,
          timestamp: data.timestamp,
          videoId: data.videoId,
          lessonTitle: data.lessonTitle,
          savedAt: nowIso,
          mastered: data.mastered,
          interval: scheduledDays,
          easeFactor: data.easeFactor,
          repetitions: reps,
          dueDate,
          lastReviewedAt: lastReview || undefined,
          due,
          stability: data.stability,
          difficulty: data.difficulty,
          elapsed_days: data.elapsed_days,
          scheduled_days: scheduledDays,
          reps,
          lapses: data.lapses,
          learning_steps: data.learning_steps,
          state: data.state,
          last_review: lastReview,
        },
      },
      201
    )
  } catch (err) {
    console.error('[API vocabulary:save error]', err)
    return c.json({ success: false, error: 'Failed to save vocabulary word' }, 500)
  }
})

// DELETE /:id - Delete a saved vocabulary item (verifying ownership or word match)
vocabularyRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const vocabIdOrWord = decodeURIComponent(c.req.param('id')).trim()
  const db = c.env.DB

  try {
    // 1. Try finding by ID
    const byId = await db
      .prepare('SELECT id, user_id FROM saved_vocabulary WHERE id = ?')
      .bind(vocabIdOrWord)
      .first<{ id: string; user_id: string }>()

    if (byId) {
      if (byId.user_id !== userId) {
        return c.json({ success: false, error: 'Forbidden: You do not own this vocabulary item' }, 403)
      }
      await db
        .prepare('DELETE FROM saved_vocabulary WHERE id = ? AND user_id = ?')
        .bind(byId.id, userId)
        .run()
      return c.json({
        success: true,
        message: 'Vocabulary item deleted successfully',
      })
    }

    // 2. Try finding by Word for current user
    const byWord = await db
      .prepare('SELECT id, user_id FROM saved_vocabulary WHERE LOWER(word) = LOWER(?) AND user_id = ?')
      .bind(vocabIdOrWord, userId)
      .first<{ id: string; user_id: string }>()

    if (byWord) {
      await db
        .prepare('DELETE FROM saved_vocabulary WHERE id = ? AND user_id = ?')
        .bind(byWord.id, userId)
        .run()
      return c.json({
        success: true,
        message: 'Vocabulary item deleted successfully',
      })
    }

    return c.json({ success: false, error: 'Vocabulary item not found' }, 404)
  } catch (err) {
    console.error('[API vocabulary:delete error]', err)
    return c.json({ success: false, error: 'Failed to delete vocabulary word' }, 500)
  }
})
