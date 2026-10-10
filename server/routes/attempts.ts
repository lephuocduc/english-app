import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const attemptsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const recordAttemptSchema = z.object({
  id: z.string().optional(),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  segmentId: z.string().min(1, 'Segment ID is required'),
  userInput: z.string(),
  score: z.number().int().min(0).max(100),
  accuracy: z.number().min(0).max(1),
  correctCount: z.number().int().min(0).default(0),
  missingCount: z.number().int().min(0).default(0),
  incorrectCount: z.number().int().min(0).default(0),
  extraCount: z.number().int().min(0).default(0),
})

interface AttemptRow {
  id: string
  lesson_id: string
  segment_id: string
  user_id: string
  user_input: string
  score: number
  accuracy: number
  correct_count: number
  missing_count: number
  incorrect_count: number
  extra_count: number
  created_at: string
}

// POST / - Record a new dictation attempt and auto-update learning progress
attemptsRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parseResult = recordAttemptSchema.safeParse(body)
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
  const attemptId = data.id || `attempt-${crypto.randomUUID()}`

  try {
    // 1. Check segment existence & ownership
    const segment = await db
      .prepare('SELECT user_id, lesson_id FROM transcript_segments WHERE id = ?')
      .bind(data.segmentId)
      .first<{ user_id: string; lesson_id: string }>()

    if (!segment) {
      return c.json({ success: false, error: 'Transcript segment not found' }, 404)
    }

    if (segment.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this segment' }, 403)
    }

    // 2. Insert dictation attempt using parameterized query
    const insertAttemptStmt = db
      .prepare(
        `INSERT INTO dictation_attempts 
         (id, lesson_id, segment_id, user_id, user_input, score, accuracy, correct_count, missing_count, incorrect_count, extra_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        attemptId,
        data.lessonId,
        data.segmentId,
        userId,
        data.userInput,
        data.score,
        data.accuracy,
        data.correctCount,
        data.missingCount,
        data.incorrectCount,
        data.extraCount
      )

    // 3. Update or upsert sentence_progress
    const progressId = `prog-${userId}-${data.segmentId}`
    const isCompleted = data.score >= 90 ? 1 : 0
    const upsertProgressStmt = db
      .prepare(
        `INSERT INTO sentence_progress (id, user_id, lesson_id, segment_id, user_input, score, is_revealed, attempts_count, completed, last_attempt_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, datetime('now'), datetime('now'))
         ON CONFLICT(user_id, lesson_id, segment_id) DO UPDATE SET
            user_input = excluded.user_input,
            score = MAX(sentence_progress.score, excluded.score),
            attempts_count = sentence_progress.attempts_count + 1,
            completed = CASE WHEN excluded.completed = 1 OR sentence_progress.completed = 1 THEN 1 ELSE 0 END,
            last_attempt_at = datetime('now'),
            updated_at = datetime('now')`
      )
      .bind(
        progressId,
        userId,
        data.lessonId,
        data.segmentId,
        data.userInput,
        data.score,
        isCompleted
      )

    await db.batch([insertAttemptStmt, upsertProgressStmt])

    return c.json(
      {
        success: true,
        data: {
          id: attemptId,
          lessonId: data.lessonId,
          segmentId: data.segmentId,
          score: data.score,
          accuracy: data.accuracy,
          completed: Boolean(isCompleted),
        },
      },
      201
    )
  } catch (err) {
    console.error('[API attempts:record error]', err)
    return c.json({ success: false, error: 'Failed to record dictation attempt' }, 500)
  }
})

// GET /lessons/:lessonId - Retrieve attempts for a lesson
attemptsRouter.get('/lessons/:lessonId', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('lessonId')
  const db = c.env.DB

  try {
    const { results } = await db
      .prepare(
        `SELECT id, lesson_id as lessonId, segment_id as segmentId, user_input as userInput,
                score, accuracy, correct_count as correctCount, missing_count as missingCount,
                incorrect_count as incorrectCount, extra_count as extraCount, created_at as createdAt
         FROM dictation_attempts 
         WHERE lesson_id = ? AND user_id = ? 
         ORDER BY created_at DESC`
      )
      .bind(lessonId, userId)
      .all<AttemptRow>()

    return c.json({
      success: true,
      data: results || [],
    })
  } catch (err) {
    console.error('[API attempts:listByLesson error]', err)
    return c.json({ success: false, error: 'Failed to retrieve attempts' }, 500)
  }
})

// GET /segments/:segmentId - Retrieve attempts for a specific sentence segment
attemptsRouter.get('/segments/:segmentId', async (c) => {
  const userId = c.get('userId')
  const segmentId = c.req.param('segmentId')
  const db = c.env.DB

  try {
    const { results } = await db
      .prepare(
        `SELECT id, lesson_id as lessonId, segment_id as segmentId, user_input as userInput,
                score, accuracy, correct_count as correctCount, missing_count as missingCount,
                incorrect_count as incorrectCount, extra_count as extraCount, created_at as createdAt
         FROM dictation_attempts 
         WHERE segment_id = ? AND user_id = ? 
         ORDER BY created_at DESC`
      )
      .bind(segmentId, userId)
      .all<AttemptRow>()

    return c.json({
      success: true,
      data: results || [],
    })
  } catch (err) {
    console.error('[API attempts:listBySegment error]', err)
    return c.json({ success: false, error: 'Failed to retrieve segment attempts' }, 500)
  }
})
