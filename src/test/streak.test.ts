import { describe, it, expect } from 'vitest'
import {
  getDaysDiff,
  getIsoWeekKey,
  createInitialStreak,
  evaluateStreakStatus,
  recordSegmentCompleted,
} from '../lib/streak/streakManager'

describe('Daily Streak & Streak Freeze Manager', () => {
  it('formats dates and calculates day differences correctly', () => {
    expect(getDaysDiff('2026-11-01', '2026-11-01')).toBe(0)
    expect(getDaysDiff('2026-11-01', '2026-11-02')).toBe(1)
    expect(getDaysDiff('2026-11-01', '2026-11-05')).toBe(4)
    expect(getDaysDiff('2026-11-05', '2026-11-01')).toBe(-4)
  })

  it('generates consistent ISO week keys', () => {
    // 2026-11-09 is Monday
    const monday = new Date(2026, 10, 9)
    const sunday = new Date(2026, 10, 15)
    expect(getIsoWeekKey(monday)).toBe(getIsoWeekKey(sunday))

    // Next Monday is in next week
    const nextMonday = new Date(2026, 10, 16)
    expect(getIsoWeekKey(monday)).not.toBe(getIsoWeekKey(nextMonday))
  })

  it('starts with a clean initial streak for new users', () => {
    const initial = createInitialStreak()
    expect(initial.currentStreak).toBe(0)
    expect(initial.longestStreak).toBe(0)
    expect(initial.lastActiveDate).toBeNull()
    expect(initial.todayCompleted).toBe(false)
    expect(initial.freezeAvailable).toBe(true)
    expect(initial.freezeUsedDates).toEqual([])
  })

  it('increments streak on first completion and prevents double-increment on same day', () => {
    const day1 = new Date(2026, 10, 9, 10, 0, 0)
    const initial = createInitialStreak()

    const res1 = recordSegmentCompleted(initial, day1)
    expect(res1.justCompleted).toBe(true)
    expect(res1.freezeUsed).toBe(false)
    expect(res1.streak.currentStreak).toBe(1)
    expect(res1.streak.longestStreak).toBe(1)
    expect(res1.streak.todayCompleted).toBe(true)
    expect(res1.streak.totalDaysActive).toBe(1)
    expect(res1.streak.lastActiveDate).toBe('2026-11-09')

    // Second completion on same day should not increment
    const res2 = recordSegmentCompleted(res1.streak, new Date(2026, 10, 9, 15, 0, 0))
    expect(res2.justCompleted).toBe(false)
    expect(res2.streak.currentStreak).toBe(1)
    expect(res2.streak.totalDaysActive).toBe(1)
  })

  it('increments streak across consecutive days', () => {
    const day1 = new Date(2026, 10, 9, 10, 0, 0)
    const day2 = new Date(2026, 10, 10, 10, 0, 0)
    const day3 = new Date(2026, 10, 11, 10, 0, 0)

    let streak = createInitialStreak()
    streak = recordSegmentCompleted(streak, day1).streak
    expect(streak.currentStreak).toBe(1)

    // Evaluate on day 2 before doing any segment
    const evalDay2 = evaluateStreakStatus(streak, day2)
    expect(evalDay2.currentStreak).toBe(1)
    expect(evalDay2.todayCompleted).toBe(false)

    // Complete on day 2
    streak = recordSegmentCompleted(streak, day2).streak
    expect(streak.currentStreak).toBe(2)
    expect(streak.longestStreak).toBe(2)

    // Complete on day 3
    streak = recordSegmentCompleted(streak, day3).streak
    expect(streak.currentStreak).toBe(3)
    expect(streak.longestStreak).toBe(3)
    expect(streak.totalDaysActive).toBe(3)
  })

  it('preserves streak when taking 1 rest day in the week via Streak Freeze', () => {
    // Day 1: Tuesday Nov 10
    const tuesday = new Date(2026, 10, 10, 10, 0, 0)
    // Day 2: Wednesday Nov 11 (skipped / rest day!)
    // Day 3: Thursday Nov 12
    const thursday = new Date(2026, 10, 12, 10, 0, 0)

    let streak = createInitialStreak()
    streak = recordSegmentCompleted(streak, tuesday).streak
    expect(streak.currentStreak).toBe(1)

    // On Thursday morning, evaluating streak should automatically consume 1 freeze for Wednesday
    const evalThursday = evaluateStreakStatus(streak, thursday)
    expect(evalThursday.currentStreak).toBe(1) // NOT broken!
    expect(evalThursday.todayCompleted).toBe(false)
    expect(evalThursday.freezeUsedDates).toContain('2026-11-11')
    expect(evalThursday.freezeAvailable).toBe(false) // 1 freeze per week used up

    // Completing Thursday's segment advances streak to 2!
    const res = recordSegmentCompleted(streak, thursday)
    expect(res.justCompleted).toBe(true)
    expect(res.freezeUsed).toBe(true)
    expect(res.streak.currentStreak).toBe(2)
    expect(res.streak.lastActiveDate).toBe('2026-11-12')
    expect(res.streak.freezeUsedDates).toContain('2026-11-11')
    expect(res.streak.freezeAvailable).toBe(false)
  })

  it('breaks streak if missing a second rest day in the same week (freeze limit: 1 per week)', () => {
    // Day 1: Tuesday Nov 10 (completed)
    // Day 2: Wednesday Nov 11 (freeze used)
    // Day 3: Thursday Nov 12 (completed, streak = 2)
    // Day 4: Friday Nov 13 (missed second day in same week!)
    // Day 5: Saturday Nov 14 (opens app)
    const tuesday = new Date(2026, 10, 10, 10, 0, 0)
    const thursday = new Date(2026, 10, 12, 10, 0, 0)
    const saturday = new Date(2026, 10, 14, 10, 0, 0)

    let streak = createInitialStreak()
    streak = recordSegmentCompleted(streak, tuesday).streak
    streak = recordSegmentCompleted(streak, thursday).streak
    expect(streak.currentStreak).toBe(2)
    expect(streak.freezeAvailable).toBe(false)

    // On Saturday, user missed Friday. But freeze is already spent for this week!
    const evalSat = evaluateStreakStatus(streak, saturday)
    expect(evalSat.currentStreak).toBe(0) // Streak broke

    const resSat = recordSegmentCompleted(streak, saturday)
    expect(resSat.justCompleted).toBe(true)
    expect(resSat.streak.currentStreak).toBe(1) // Starts fresh from 1
  })

  it('breaks streak if absent for 3 consecutive days', () => {
    const day1 = new Date(2026, 10, 1, 10, 0, 0)
    const day5 = new Date(2026, 10, 5, 10, 0, 0) // 4 days later

    let streak = createInitialStreak()
    streak = recordSegmentCompleted(streak, day1).streak
    expect(streak.currentStreak).toBe(1)

    const evalDay5 = evaluateStreakStatus(streak, day5)
    expect(evalDay5.currentStreak).toBe(0)

    const resDay5 = recordSegmentCompleted(streak, day5)
    expect(resDay5.streak.currentStreak).toBe(1)
  })

  it('replenishes streak freeze in the following week', () => {
    // Week 1: Thursday Nov 12 (freeze used for Wednesday)
    const thursday = new Date(2026, 10, 12, 10, 0, 0)
    let streak = createInitialStreak()
    streak = recordSegmentCompleted(streak, new Date(2026, 10, 10)).streak
    streak = recordSegmentCompleted(streak, thursday).streak
    expect(streak.freezeAvailable).toBe(false)

    // Week 2: Monday Nov 16
    const nextMonday = new Date(2026, 10, 16, 10, 0, 0)
    const evalNextWeek = evaluateStreakStatus(streak, nextMonday)
    expect(evalNextWeek.freezeAvailable).toBe(true) // Freeze is available again!
  })
})
