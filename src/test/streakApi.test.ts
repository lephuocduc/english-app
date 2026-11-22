import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../../server'
import { createTestD1Database } from '../../server/test/d1-sqlite'
import type { D1Database } from '../../server/types'
import type { StreakData } from '../types'

describe('ListenFlow Daily Streak & Streak Freeze API', () => {
  let db: D1Database

  beforeEach(() => {
    db = createTestD1Database(false)
  })

  const makeRequest = async (
    path: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: unknown
    } = {}
  ) => {
    const { method = 'GET', headers = {}, body } = options
    const reqHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'x-user-id': 'test-user',
      ...headers,
    }

    const init: RequestInit = {
      method,
      headers: reqHeaders,
    }

    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    return app.request(path, init, {
      DB: db,
    })
  }

  it('GET /api/streak returns default initial streak for new user', async () => {
    const res = await makeRequest('/api/streak')
    expect(res.status).toBe(200)

    const json = (await res.json()) as { success: boolean; data: StreakData }
    expect(json.success).toBe(true)
    expect(json.data.currentStreak).toBe(0)
    expect(json.data.longestStreak).toBe(0)
    expect(json.data.todayCompleted).toBe(false)
    expect(json.data.freezeAvailable).toBe(true)
  })

  it('POST /api/streak/record records first completion and increments streak to 1', async () => {
    const res = await makeRequest('/api/streak/record', { method: 'POST' })
    expect(res.status).toBe(200)

    const json = (await res.json()) as {
      success: boolean
      data: StreakData
      justCompleted: boolean
      freezeUsed: boolean
    }
    expect(json.success).toBe(true)
    expect(json.justCompleted).toBe(true)
    expect(json.freezeUsed).toBe(false)
    expect(json.data.currentStreak).toBe(1)
    expect(json.data.longestStreak).toBe(1)
    expect(json.data.todayCompleted).toBe(true)
    expect(json.data.totalDaysActive).toBe(1)

    // Second record call on same day should not increment
    const res2 = await makeRequest('/api/streak/record', { method: 'POST' })
    const json2 = (await res2.json()) as {
      success: boolean
      data: StreakData
      justCompleted: boolean
    }
    expect(json2.justCompleted).toBe(false)
    expect(json2.data.currentStreak).toBe(1)
  })

  it('PUT /api/streak/sync syncs client streak state into D1 DB', async () => {
    const clientData: StreakData = {
      currentStreak: 5,
      longestStreak: 12,
      lastActiveDate: '2026-11-08',
      freezeUsedDates: ['2026-11-05'],
      lastFreezeWeek: '2026-W45',
      freezeAvailable: true,
      todayCompleted: false,
      totalDaysActive: 15,
    }

    const res = await makeRequest('/api/streak/sync', {
      method: 'PUT',
      body: clientData,
    })
    expect(res.status).toBe(200)

    // Verify GET /api/streak now reads the synced data
    const getRes = await makeRequest('/api/streak')
    const getJson = (await getRes.json()) as { success: boolean; data: StreakData }
    expect(getJson.success).toBe(true)
    expect(getJson.data.longestStreak).toBe(12)
    expect(getJson.data.freezeUsedDates).toContain('2026-11-05')
  })

  it('respects client localDate on POST /api/streak/record and supports force reset on PUT /api/streak/sync', async () => {
    // Client in UTC+7 records two completions on local date 2026-11-21
    const r1 = await makeRequest('/api/streak/record', {
      method: 'POST',
      body: { localDate: '2026-11-21' },
    })
    const j1 = (await r1.json()) as { data: StreakData; justCompleted: boolean }
    expect(j1.justCompleted).toBe(true)
    expect(j1.data.currentStreak).toBe(1)
    expect(j1.data.lastActiveDate).toBe('2026-11-21')

    const r2 = await makeRequest('/api/streak/record', {
      method: 'POST',
      body: { localDate: '2026-11-21' },
    })
    const j2 = (await r2.json()) as { data: StreakData; justCompleted: boolean }
    expect(j2.justCompleted).toBe(false)
    expect(j2.data.currentStreak).toBe(1)

    // Force-reset inflated streak back to 1
    await makeRequest('/api/streak/sync', {
      method: 'PUT',
      body: {
        currentStreak: 9,
        longestStreak: 9,
        lastActiveDate: '2026-11-21',
        freezeUsedDates: [],
        lastFreezeWeek: null,
        freezeAvailable: true,
        totalDaysActive: 9,
      },
    })
    await makeRequest('/api/streak/sync', {
      method: 'PUT',
      body: {
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: '2026-11-21',
        freezeUsedDates: [],
        lastFreezeWeek: null,
        freezeAvailable: true,
        totalDaysActive: 1,
        force: true,
      },
    })

    const getRes = await makeRequest('/api/streak?date=2026-11-21')
    const getJson = (await getRes.json()) as { data: StreakData }
    expect(getJson.data.currentStreak).toBe(1)
    expect(getJson.data.longestStreak).toBe(1)
    expect(getJson.data.totalDaysActive).toBe(1)

    // Stale sync from another tab/device with an older lastActiveDate must NOT regress last_active_date
    await makeRequest('/api/streak/sync', {
      method: 'PUT',
      body: {
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: '2026-11-20',
        freezeUsedDates: [],
        lastFreezeWeek: null,
        freezeAvailable: true,
        totalDaysActive: 1,
      },
    })
    const afterStaleRes = await makeRequest('/api/streak?date=2026-11-21')
    const afterStaleJson = (await afterStaleRes.json()) as { data: StreakData }
    expect(afterStaleJson.data.lastActiveDate).toBe('2026-11-21')
    expect(afterStaleJson.data.todayCompleted).toBe(true)
  })
})

