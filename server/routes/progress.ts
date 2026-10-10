import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const progressRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const updateProgressSchema = z.object({
  userInput: z.string().default(''),
  score: z.number().int().min(0).max(100).default(0),
  isRevealed: z.boolean().default(false),
  attemptsCount: z.number().int().min(0).optional(),
  completed: z.boolean().default(false),
})

interface ProgressRow {
  id: string
  user_id: string
  lesson_id: string
  segment_id: string
  user_input: string
  score: number
  is_revealed: number
  attempts_count: number
  completed: number
  last_attempt_at: string | null
  updated_at: string
}

// GET /lessons/:lessonId - Get user's learning progress for all sentences in a lesson
progressRouter.get('/lessons/:lessonId', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('lessonId')
  const db = c.env.DB

  try {
    const { results } = await db
      .prepare(
        `SELECT segment_id as segmentId, user_input as userInput, score, 
                is_revealed as isRevealed, attempts_count as attempts, completed,
                last_attempt_at as lastAttemptAt, updated_at as updatedAt
         FROM sentence_progress 
         WHERE lesson_id = ? AND user_id = ?`
      )
      .bind(lessonId, userId)
      .all<ProgressRow>()

    // Transform into record map matching frontend UserLessonProgress['sentenceProgress']
    const sentenceProgress: Record<string, unknown> = {}
    let lastSentenceId = ''

    if (results && results.length > 0) {
      for (const row of results) {
        const segId = (row as unknown as { segmentId: string }).segmentId
        sentenceProgress[segId] = {
          sentenceId: segId,
          userInput: (row as unknown as { userInput: string }).userInput || '',
          score: (row as unknown as { score: number }).score || 0,
          isRevealed: Boolean((row as unknown as { isRevealed: number }).isRevealed),
          attempts: (row as unknown as { attempts: number }).attempts || 0,
          completed: Boolean((row as unknown as { completed: number }).completed),
          lastAttemptAt: (row as unknown as { lastAttemptAt: string | null }).lastAttemptAt || new Date().toISOString(),
        }
        lastSentenceId = segId
      }
    }

    return c.json({
      success: true,
      data: {
        lessonId,
        sentenceProgress,
        lastSentenceId,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[API progress:get error]', err)
    return c.json({ success: false, error: 'Failed to retrieve lesson progress' }, 500)
  }
})

// PUT /lessons/:lessonId/:segmentId - Upsert per-sentence progress
progressRouter.put('/lessons/:lessonId/:segmentId', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('lessonId')
  const segmentId = c.req.param('segmentId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parseResult = updateProgressSchema.safeParse(body)
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
  const progressId = `prog-${userId}-${segmentId}`

  try {
    // Parameterized upsert
    await db
      .prepare(
        `INSERT INTO sentence_progress (id, user_id, lesson_id, segment_id, user_input, score, is_revealed, attempts_count, completed, last_attempt_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?, datetime('now'), datetime('now'))
         ON CONFLICT(user_id, lesson_id, segment_id) DO UPDATE SET
            user_input = excluded.user_input,
            score = excluded.score,
            is_revealed = excluded.is_revealed,
            attempts_count = CASE WHEN ? IS NOT NULL THEN ? ELSE sentence_progress.attempts_count + 1 END,
            completed = excluded.completed,
            last_attempt_at = datetime('now'),
            updated_at = datetime('now')`
      )
      .bind(
        progressId,
        userId,
        lessonId,
        segmentId,
        data.userInput,
        data.score,
        data.isRevealed ? 1 : 0,
        data.attemptsCount !== undefined ? data.attemptsCount : null,
        data.completed ? 1 : 0,
        data.attemptsCount !== undefined ? data.attemptsCount : null,
        data.attemptsCount !== undefined ? data.attemptsCount : null
      )
      .run()

    return c.json({
      success: true,
      data: {
        sentenceId: segmentId,
        userInput: data.userInput,
        score: data.score,
        isRevealed: data.isRevealed,
        completed: data.completed,
      },
    })
  } catch (err) {
    console.error('[API progress:upsert error]', err)
    return c.json({ success: false, error: 'Failed to update sentence progress' }, 500)
  }
})

// DELETE /lessons/:lessonId - Clear/reset progress for a lesson
progressRouter.delete('/lessons/:lessonId', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('lessonId')
  const db = c.env.DB

  try {
    await db
      .prepare('DELETE FROM sentence_progress WHERE lesson_id = ? AND user_id = ?')
      .bind(lessonId, userId)
      .run()

    return c.json({
      success: true,
      message: 'Lesson progress reset successfully',
    })
  } catch (err) {
    console.error('[API progress:delete error]', err)
    return c.json({ success: false, error: 'Failed to reset progress' }, 500)
  }
})
