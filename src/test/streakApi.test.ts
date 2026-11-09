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
})

