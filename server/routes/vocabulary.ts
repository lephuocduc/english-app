import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const vocabularyRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

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
  interval: z.number().min(0).default(0),
  easeFactor: z.number().min(1.0).default(2.5),
  repetitions: z.number().min(0).default(0),
  dueDate: z.string().max(30).optional(),
  lastReviewedAt: z.string().max(40).optional(),
})

interface VocabRow {
  id: string
  user_id: string
  word: string
  meaning: string | null
  context_sentence: string | null
  context_sentence_translation: string | null
  timestamp: number | null
  video_id: string | null
  lesson_title: string | null
  saved_at: string
  mastered: number | null
  interval: number | null
  ease_factor: number | null
  repetitions: number | null
  due_date: string | null
  last_reviewed_at: string | null
}

// GET / - List all saved vocabulary for the authenticated user
vocabularyRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const { results } = await db
      .prepare(
        `SELECT id, word, meaning, 
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
                last_reviewed_at as lastReviewedAt
         FROM saved_vocabulary 
         WHERE user_id = ? 
         ORDER BY saved_at DESC`
      )
      .bind(userId)
      .all<VocabRow>()

    const data = (results || []).map((row) => ({
      ...row,
      mastered: Boolean(row.mastered),
      interval: Number(row.interval || 0),
      repetitions: Number(row.repetitions || 0),
      easeFactor: Number(row.ease_factor ?? 2.5),
    }))

    return c.json({
      success: true,
      data,
    })
  } catch (err) {
    console.error('[API vocabulary:list error]', err)
    return c.json({ success: false, error: 'Failed to retrieve saved vocabulary' }, 500)
  }
})

// POST / - Save or update a vocabulary item with SRS Spaced Repetition progress
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
  const vocabId = data.id || `vocab-${crypto.randomUUID()}`

  try {
    // Parameterized upsert
    await db
      .prepare(
        `INSERT INTO saved_vocabulary (
          id, user_id, word, meaning, context_sentence, context_sentence_translation,
          timestamp, video_id, lesson_title, saved_at,
          mastered, interval, ease_factor, repetitions, due_date, last_reviewed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
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
          last_reviewed_at = excluded.last_reviewed_at`
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
        data.interval,
        data.easeFactor,
        data.repetitions,
        data.dueDate || null,
        data.lastReviewedAt || null
      )
      .run()

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
          savedAt: new Date().toISOString(),
          mastered: data.mastered,
          interval: data.interval,
          easeFactor: data.easeFactor,
          repetitions: data.repetitions,
          dueDate: data.dueDate,
          lastReviewedAt: data.lastReviewedAt,
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
