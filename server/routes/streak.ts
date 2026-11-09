import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import {
  evaluateStreakStatus,
  recordSegmentCompleted,
  createInitialStreak,
} from '../../src/lib/streak/streakManager'
import type { StreakData } from '../../src/types'

export const streakRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

interface StreakRow {
  user_id: string
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  freeze_used_dates: string
  last_freeze_week: string | null
  freeze_available: number
  total_days_active: number
  updated_at: string
}

const syncStreakSchema = z.object({
  currentStreak: z.number().int().min(0).default(0),
  longestStreak: z.number().int().min(0).default(0),
  lastActiveDate: z.string().nullable().optional(),
  freezeUsedDates: z.array(z.string()).default([]),
  lastFreezeWeek: z.string().nullable().optional(),
  freezeAvailable: z.boolean().default(true),
  totalDaysActive: z.number().int().min(0).default(0),
})

function rowToStreakData(row: StreakRow | null): StreakData {
  if (!row) {
    return createInitialStreak()
  }

  let freezeDates: string[] = []
  try {
    freezeDates = JSON.parse(row.freeze_used_dates || '[]')
    if (!Array.isArray(freezeDates)) freezeDates = []
  } catch {
    freezeDates = []
  }

  return {
    currentStreak: row.current_streak || 0,
    longestStreak: row.longest_streak || 0,
    lastActiveDate: row.last_active_date || null,
    freezeUsedDates: freezeDates,
    lastFreezeWeek: row.last_freeze_week || null,
    freezeAvailable: Boolean(row.freeze_available),
    todayCompleted: false, // will be evaluated
    totalDaysActive: row.total_days_active || 0,
  }
}

// GET /api/streak - Retrieve user streak and evaluate freeze status
streakRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const row = await db
      .prepare(
        `SELECT user_id, current_streak, longest_streak, last_active_date, 
                freeze_used_dates, last_freeze_week, freeze_available, 
                total_days_active, updated_at
         FROM user_streaks
         WHERE user_id = ?`
      )
      .bind(userId)
      .first<StreakRow>()

    const rawStreak = rowToStreakData(row)
    const evaluated = evaluateStreakStatus(rawStreak, new Date())

    // If evaluated status changed (e.g. freeze consumed for yesterday), save updated row
    const hadChanges =
      evaluated.freezeUsedDates.length !== rawStreak.freezeUsedDates.length ||
      evaluated.currentStreak !== rawStreak.currentStreak ||
      evaluated.lastActiveDate !== rawStreak.lastActiveDate

    if (hadChanges) {
      await db
        .prepare(
          `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date, freeze_used_dates, last_freeze_week, freeze_available, total_days_active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             current_streak = excluded.current_streak,
             longest_streak = excluded.longest_streak,
             last_active_date = excluded.last_active_date,
             freeze_used_dates = excluded.freeze_used_dates,
             last_freeze_week = excluded.last_freeze_week,
             freeze_available = excluded.freeze_available,
             total_days_active = excluded.total_days_active,
             updated_at = datetime('now')`
        )
        .bind(
          userId,
          evaluated.currentStreak,
          evaluated.longestStreak,
          evaluated.lastActiveDate,
          JSON.stringify(evaluated.freezeUsedDates),
          evaluated.lastFreezeWeek,
          evaluated.freezeAvailable ? 1 : 0,
          evaluated.totalDaysActive
        )
        .run()
    }

    return c.json({
      success: true,
      data: evaluated,
    })
  } catch (err) {
    console.error('[API streak:get error]', err)
    return c.json({ success: false, error: 'Failed to retrieve streak' }, 500)
  }
})

// POST /api/streak/record - Record 1 listening segment completion for today
streakRouter.post('/record', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const row = await db
      .prepare(
        `SELECT user_id, current_streak, longest_streak, last_active_date, 
                freeze_used_dates, last_freeze_week, freeze_available, 
                total_days_active, updated_at
         FROM user_streaks
         WHERE user_id = ?`
      )
      .bind(userId)
      .first<StreakRow>()

    const rawStreak = rowToStreakData(row)
    const result = recordSegmentCompleted(rawStreak, new Date())
    const updated = result.streak

    await db
      .prepare(
        `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date, freeze_used_dates, last_freeze_week, freeze_available, total_days_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           current_streak = excluded.current_streak,
           longest_streak = excluded.longest_streak,
           last_active_date = excluded.last_active_date,
           freeze_used_dates = excluded.freeze_used_dates,
           last_freeze_week = excluded.last_freeze_week,
           freeze_available = excluded.freeze_available,
           total_days_active = excluded.total_days_active,
           updated_at = datetime('now')`
      )
      .bind(
        userId,
        updated.currentStreak,
        updated.longestStreak,
        updated.lastActiveDate,
        JSON.stringify(updated.freezeUsedDates),
        updated.lastFreezeWeek,
        updated.freezeAvailable ? 1 : 0,
        updated.totalDaysActive
      )
      .run()

    return c.json({
      success: true,
      data: updated,
      justCompleted: result.justCompleted,
      freezeUsed: result.freezeUsed,
    })
  } catch (err) {
    console.error('[API streak:record error]', err)
    return c.json({ success: false, error: 'Failed to record streak activity' }, 500)
  }
})

// PUT /api/streak/sync - Sync streak state from client
streakRouter.put('/sync', async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const parsed = syncStreakSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed' }, 400)
  }

  const data = parsed.data
  try {
    await db
      .prepare(
        `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date, freeze_used_dates, last_freeze_week, freeze_available, total_days_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           current_streak = MAX(user_streaks.current_streak, excluded.current_streak),
           longest_streak = MAX(user_streaks.longest_streak, excluded.longest_streak),
           last_active_date = COALESCE(excluded.last_active_date, user_streaks.last_active_date),
           freeze_used_dates = excluded.freeze_used_dates,
           last_freeze_week = excluded.last_freeze_week,
           freeze_available = excluded.freeze_available,
           total_days_active = MAX(user_streaks.total_days_active, excluded.total_days_active),
           updated_at = datetime('now')`
      )
      .bind(
        userId,
        data.currentStreak,
        data.longestStreak,
        data.lastActiveDate || null,
        JSON.stringify(data.freezeUsedDates),
        data.lastFreezeWeek || null,
        data.freezeAvailable ? 1 : 0,
        data.totalDaysActive
      )
      .run()

    return c.json({
      success: true,
      data,
    })
  } catch (err) {
    console.error('[API streak:sync error]', err)
    return c.json({ success: false, error: 'Failed to sync streak' }, 500)
  }
})

