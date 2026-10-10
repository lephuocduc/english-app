import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const segmentsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const segmentItemSchema = z.object({
  id: z.string().optional(),
  startTime: z.number().min(0, 'Start time must be non-negative'),
  endTime: z.number().min(0, 'End time must be non-negative'),
  text: z.string().min(1, 'Transcript text cannot be empty').trim(),
  translation: z.string().optional(),
  hint: z.string().optional(),
  sequenceOrder: z.number().int().min(0).optional(),
}).refine((data) => data.endTime >= data.startTime, {
  message: 'End time must be greater than or equal to start time',
  path: ['endTime'],
})

const batchSegmentsSchema = z.object({
  segments: z.array(segmentItemSchema).min(1, 'At least one segment must be provided'),
})

const updateSegmentSchema = z.object({
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
  text: z.string().min(1).trim().optional(),
  translation: z.string().optional(),
  hint: z.string().optional(),
  sequenceOrder: z.number().int().min(0).optional(),
})

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

// GET /lessons/:lessonId - Retrieve all segments for a lesson
segmentsRouter.get('/lessons/:lessonId', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('lessonId')
  const db = c.env.DB

  try {
    // 1. Verify lesson ownership
    const lesson = await db
      .prepare('SELECT user_id FROM lessons WHERE id = ?')
      .bind(lessonId)
      .first<{ user_id: string }>()

    if (!lesson) {
      return c.json({ success: false, error: 'Lesson not found' }, 404)
    }

    if (lesson.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not have permission for this lesson' }, 403)
    }

    const { results } = await db
      .prepare(
        `SELECT id, lesson_id as lessonId, start_time as startTime, end_time as endTime, 
                text, translation, hint, sequence_order as sequenceOrder 
         FROM transcript_segments 
         WHERE lesson_id = ? AND user_id = ? 
         ORDER BY sequence_order ASC, start_time ASC`
      )
      .bind(lessonId, userId)
      .all<SegmentRow>()

    return c.json({
      success: true,
      data: results || [],
    })
  } catch (err) {
    console.error('[API segments:list error]', err)
    return c.json({ success: false, error: 'Failed to retrieve transcript segments' }, 500)
  }
})

// POST /lessons/:lessonId - Add transcript segments (single or batch)
segmentsRouter.post('/lessons/:lessonId', async (c) => {
  const userId = c.get('userId')
  const lessonId = c.req.param('lessonId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  // Support either { segments: [...] } or a single segment object
  let segmentsToInsert: z.infer<typeof segmentItemSchema>[] = []
  const batchParse = batchSegmentsSchema.safeParse(body)
  if (batchParse.success) {
    segmentsToInsert = batchParse.data.segments
  } else {
    const singleParse = segmentItemSchema.safeParse(body)
    if (singleParse.success) {
      segmentsToInsert = [singleParse.data]
    } else {
      return c.json(
        {
          success: false,
          error: 'Validation failed for transcript segments',
          details: singleParse.error.flatten(),
        },
        400
      )
    }
  }

  try {
    // Verify lesson ownership
    const lesson = await db
      .prepare('SELECT user_id FROM lessons WHERE id = ?')
      .bind(lessonId)
      .first<{ user_id: string }>()

    if (!lesson) {
      return c.json({ success: false, error: 'Lesson not found' }, 404)
    }

    if (lesson.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this lesson' }, 403)
    }

    const insertedIds: string[] = []
    const statements = segmentsToInsert.map((seg, idx) => {
      const segId = seg.id || `seg-${crypto.randomUUID()}`
      insertedIds.push(segId)
      const order = seg.sequenceOrder !== undefined ? seg.sequenceOrder : idx
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
          order
        )
    })

    await db.batch(statements)

    return c.json(
      {
        success: true,
        message: `Successfully created ${statements.length} segment(s)`,
        data: { insertedIds, count: statements.length },
      },
      201
    )
  } catch (err) {
    console.error('[API segments:create error]', err)
    return c.json({ success: false, error: 'Failed to insert transcript segments' }, 500)
  }
})

// PUT /:id - Update an individual segment
segmentsRouter.put('/:id', async (c) => {
  const userId = c.get('userId')
  const segmentId = c.req.param('id')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parseResult = updateSegmentSchema.safeParse(body)
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
    const existing = await db
      .prepare('SELECT user_id, start_time, end_time FROM transcript_segments WHERE id = ?')
      .bind(segmentId)
      .first<{ user_id: string; start_time: number; end_time: number }>()

    if (!existing) {
      return c.json({ success: false, error: 'Segment not found' }, 404)
    }

    if (existing.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this segment' }, 403)
    }

    const { startTime, endTime, text, translation, hint, sequenceOrder } = parseResult.data

    // Check time sanity
    const effStart = startTime !== undefined ? startTime : existing.start_time
    const effEnd = endTime !== undefined ? endTime : existing.end_time
    if (effEnd < effStart) {
      return c.json({ success: false, error: 'End time must be greater than or equal to start time' }, 400)
    }

    await db
      .prepare(
        `UPDATE transcript_segments
         SET start_time = COALESCE(?, start_time),
             end_time = COALESCE(?, end_time),
             text = COALESCE(?, text),
             translation = COALESCE(?, translation),
             hint = COALESCE(?, hint),
             sequence_order = COALESCE(?, sequence_order)
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        startTime !== undefined ? startTime : null,
        endTime !== undefined ? endTime : null,
        text !== undefined ? text : null,
        translation !== undefined ? translation : null,
        hint !== undefined ? hint : null,
        sequenceOrder !== undefined ? sequenceOrder : null,
        segmentId,
        userId
      )
      .run()

    return c.json({
      success: true,
      message: 'Segment updated successfully',
    })
  } catch (err) {
    console.error('[API segments:update error]', err)
    return c.json({ success: false, error: 'Failed to update segment' }, 500)
  }
})

// DELETE /:id - Delete an individual segment
segmentsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const segmentId = c.req.param('id')
  const db = c.env.DB

  try {
    const existing = await db
      .prepare('SELECT user_id FROM transcript_segments WHERE id = ?')
      .bind(segmentId)
      .first<{ user_id: string }>()

    if (!existing) {
      return c.json({ success: false, error: 'Segment not found' }, 404)
    }

    if (existing.user_id !== userId) {
      return c.json({ success: false, error: 'Forbidden: You do not own this segment' }, 403)
    }

    await db
      .prepare('DELETE FROM transcript_segments WHERE id = ? AND user_id = ?')
      .bind(segmentId, userId)
      .run()

    return c.json({
      success: true,
      message: 'Segment deleted successfully',
    })
  } catch (err) {
    console.error('[API segments:delete error]', err)
    return c.json({ success: false, error: 'Failed to delete segment' }, 500)
  }
})
