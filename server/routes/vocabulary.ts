import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const vocabularyRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const saveVocabularySchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1, 'Word is required').max(100).trim(),
  meaning: z.string().max(500).optional(),
  contextSentence: z.string().max(1000).default(''),
  timestamp: z.number().min(0).default(0),
  videoId: z.string().max(32).default(''),
  lessonTitle: z.string().max(200).default(''),
})

interface VocabRow {
  id: string
  user_id: string
  word: string
  meaning: string | null
  context_sentence: string | null
  timestamp: number | null
  video_id: string | null
  lesson_title: string | null
  saved_at: string
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
                timestamp,
                video_id as videoId,
                lesson_title as lessonTitle,
                saved_at as savedAt
         FROM saved_vocabulary 
         WHERE user_id = ? 
         ORDER BY saved_at DESC`
      )
      .bind(userId)
      .all<VocabRow>()

    return c.json({
      success: true,
      data: results || [],
    })
  } catch (err) {
    console.error('[API vocabulary:list error]', err)
    return c.json({ success: false, error: 'Failed to retrieve saved vocabulary' }, 500)
  }
})

// POST / - Save a new vocabulary item
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
    // Parameterized insert
    await db
      .prepare(
        `INSERT INTO saved_vocabulary (id, user_id, word, meaning, context_sentence, timestamp, video_id, lesson_title, saved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        vocabId,
        userId,
        data.word,
        data.meaning || null,
        data.contextSentence,
        data.timestamp,
        data.videoId,
        data.lessonTitle
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
          timestamp: data.timestamp,
          videoId: data.videoId,
          lessonTitle: data.lessonTitle,
          savedAt: new Date().toISOString(),
        },
      },
      201
    )
  } catch (err) {
    console.error('[API vocabulary:save error]', err)
    return c.json({ success: false, error: 'Failed to save vocabulary word' }, 500)
  }
})

// DELETE /:id - Delete a saved vocabulary item (verifying ownership)
vocabularyRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const vocabId = c.req.param('id')
  const db = c.env.DB

  try {
    const existing = await db
      .prepare('SELECT user_id FROM saved_vocabulary WHERE id = ?')
      .bind(vocabId)
      .first<{ user_id: string }>()

    if (!existing) {
      return c.json({ success: false, error: 'Vocabulary item not found' }, 404)
    }

    if (existing.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this vocabulary item' }, 403)
    }

    await db
      .prepare('DELETE FROM saved_vocabulary WHERE id = ? AND user_id = ?')
      .bind(vocabId, userId)
      .run()

    return c.json({
      success: true,
      message: 'Vocabulary item deleted successfully',
    })
  } catch (err) {
    console.error('[API vocabulary:delete error]', err)
    return c.json({ success: false, error: 'Failed to delete vocabulary word' }, 500)
  }
})
