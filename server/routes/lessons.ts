import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const lessonsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const sentenceSchema = z.object({
  id: z.string().optional(),
  startTime: z.number().min(0, 'Start time must be non-negative'),
  endTime: z.number().min(0, 'End time must be non-negative'),
  text: z.string().min(1, 'Sentence text is required').trim(),
  translation: z.string().optional(),
  hint: z.string().optional(),
}).refine((data) => data.endTime >= data.startTime, {
  message: 'End time must be greater than or equal to start time',
  path: ['endTime'],
})

const createLessonSchema = z.object({
  id: z.string().optional(),
  videoId: z.string().min(1, 'YouTube Video ID is required').max(32).trim(),
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(1000).optional().default(''),
  language: z.string().max(10).default('en'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  sentences: z.array(sentenceSchema).optional().default([]),
})

const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  language: z.string().max(10).optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
})

interface LessonRow {
  id: string
  user_id: string
  video_id: string
  title: string
  description: string | null
  language: string
  level: string | null
  created_at: string
  updated_at: string
}

interface SegmentRow {
  id: string
  lesson_id: string
  user_id: string
  start_time: number
  end_time: number
  text: string
  translation: string | null
  hint: string | null
  sequence_order: number
}

// GET / - List all lessons belonging to the authenticated user
lessonsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const { results } = await db
      .prepare(
        `SELECT id, video_id as videoId, title, description, language, level, created_at as createdAt, updated_at as updatedAt 
         FROM lessons 
         WHERE user_id = ? 
         ORDER BY updated_at DESC`
      )
      .bind(userId)
      .all<LessonRow>()

    return c.json({
      success: true,
      data: results || [],
    })
  } catch (err) {
    console.error('[API lessons:list error]', err)
    return c.json({ success: false, error: 'Failed to retrieve lessons' }, 500)
  }
})

// GET /:id - Get a specific lesson by ID (with ownership check)
lessonsRouter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('id')
  const db = c.env.DB

  try {
    // 1. Fetch lesson
    const lesson = await db
      .prepare(
        `SELECT id, user_id, video_id as videoId, title, description, language, level, created_at as createdAt, updated_at as updatedAt 
         FROM lessons 
         WHERE id = ?`
      )
      .bind(lessonId)
      .first<LessonRow>()

    if (!lesson) {
      return c.json({ success: false, error: 'Lesson not found' }, 404)
    }

    // Ownership check: ensure lesson belongs to authenticated user
    if (lesson.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not have permission to access this lesson' }, 403)
    }

    // 2. Fetch associated transcript segments
    const { results: segments } = await db
      .prepare(
        `SELECT id, start_time as startTime, end_time as endTime, text, translation, hint 
         FROM transcript_segments 
         WHERE lesson_id = ? AND user_id = ? 
         ORDER BY sequence_order ASC, start_time ASC`
      )
      .bind(lessonId, userId)
      .all<SegmentRow>()

    return c.json({
      success: true,
      data: {
        id: lesson.id,
        videoId: lesson.video_id || (lesson as unknown as { videoId: string }).videoId,
        title: lesson.title,
        description: lesson.description || '',
        language: lesson.language,
        level: lesson.level || 'Intermediate',
        createdAt: lesson.created_at || (lesson as unknown as { createdAt: string }).createdAt,
        updatedAt: lesson.updated_at || (lesson as unknown as { updatedAt: string }).updatedAt,
        sentences: (segments || []).map((s) => ({
          id: s.id,
          startTime: s.start_time !== undefined ? s.start_time : (s as unknown as { startTime: number }).startTime,
          endTime: s.end_time !== undefined ? s.end_time : (s as unknown as { endTime: number }).endTime,
          text: s.text,
          translation: s.translation || undefined,
          hint: s.hint || undefined,
        })),
      },
    })
  } catch (err) {
    console.error('[API lessons:get error]', err)
    return c.json({ success: false, error: 'Failed to retrieve lesson' }, 500)
  }
})

// POST / - Create a new saved lesson
lessonsRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parseResult = createLessonSchema.safeParse(body)
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
  const lessonId = data.id || `lesson-${crypto.randomUUID()}`

  try {
    // Parameterized query to insert lesson
    await db
      .prepare(
        `INSERT INTO lessons (id, user_id, video_id, title, description, language, level, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        lessonId,
        userId,
        data.videoId,
        data.title,
        data.description || null,
        data.language,
        data.level
      )
      .run()

    // Insert segments if provided
    if (data.sentences && data.sentences.length > 0) {
      const segmentStatements = data.sentences.map((seg, idx) => {
        const segId = seg.id || `seg-${crypto.randomUUID()}`
        return db
          .prepare(
            `INSERT INTO transcript_segments (id, lesson_id, user_id, start_time, end_time, text, translation, hint, sequence_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            segId,
            lessonId,
            userId,
            seg.startTime,
            seg.endTime,
            seg.text,
            seg.translation || null,
            seg.hint || null,
            idx
          )
      })

      await db.batch(segmentStatements)
    }

    return c.json(
      {
        success: true,
        data: {
          id: lessonId,
          videoId: data.videoId,
          title: data.title,
          description: data.description,
          language: data.language,
          level: data.level,
          sentenceCount: data.sentences?.length || 0,
        },
      },
      201
    )
  } catch (err) {
    console.error('[API lessons:create error]', err)
    return c.json({ success: false, error: 'Failed to create lesson' }, 500)
  }
})

// PUT /:id - Update lesson metadata
lessonsRouter.put('/:id', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('id')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parseResult = updateLessonSchema.safeParse(body)
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

  try {
    // 1. Verify existence & ownership
    const existing = await db
      .prepare('SELECT user_id FROM lessons WHERE id = ?')
      .bind(lessonId)
      .first<{ user_id: string }>()

    if (!existing) {
      return c.json({ success: false, error: 'Lesson not found' }, 404)
    }

    if (existing.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this lesson' }, 403)
    }

    const { title, description, language, level } = parseResult.data

    await db
      .prepare(
        `UPDATE lessons 
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             language = COALESCE(?, language),
             level = COALESCE(?, level),
             updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        title !== undefined ? title : null,
        description !== undefined ? description : null,
        language !== undefined ? language : null,
        level !== undefined ? level : null,
        lessonId,
        userId
      )
      .run()

    return c.json({
      success: true,
      message: 'Lesson updated successfully',
    })
  } catch (err) {
    console.error('[API lessons:update error]', err)
    return c.json({ success: false, error: 'Failed to update lesson' }, 500)
  }
})

// DELETE /:id - Delete a lesson and all cascade items
lessonsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('id')
  const db = c.env.DB

  try {
    // Verify existence & ownership
    const existing = await db
      .prepare('SELECT user_id FROM lessons WHERE id = ?')
      .bind(lessonId)
      .first<{ user_id: string }>()

    if (!existing) {
      return c.json({ success: false, error: 'Lesson not found' }, 404)
    }

    if (existing.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this lesson' }, 403)
    }

    await db
      .prepare('DELETE FROM lessons WHERE id = ? AND user_id = ?')
      .bind(lessonId, userId)
      .run()

    return c.json({
      success: true,
      message: 'Lesson deleted successfully',
    })
  } catch (err) {
    console.error('[API lessons:delete error]', err)
    return c.json({ success: false, error: 'Failed to delete lesson' }, 500)
  }
})
