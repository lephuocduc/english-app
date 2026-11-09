import type { StreakData } from '../../types'

/**
 * Formats a Date object to 'YYYY-MM-DD' in local time
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns integer day difference between two 'YYYY-MM-DD' date strings.
 * (positive if toDateStr is after fromDateStr)
 */
export function getDaysDiff(fromDateStr: string, toDateStr: string): number {
  const [y1, m1, d1] = fromDateStr.split('-').map(Number)
  const [y2, m2, d2] = toDateStr.split('-').map(Number)
  const dt1 = Date.UTC(y1, m1 - 1, d1)
  const dt2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24))
}

/**
 * Returns ISO calendar week string, e.g. "2026-W46".
 * Standard ISO week: Monday is day 1, Sunday is day 7.
 */
export function getIsoWeekKey(date: Date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNr = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = target.getTime()
  target.setUTCMonth(0, 1)
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7))
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / (7 * 24 * 3600 * 1000))
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * Creates default streak data for a new user
 */
export function createInitialStreak(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    freezeUsedDates: [],
    lastFreezeWeek: null,
    freezeAvailable: true,
    todayCompleted: false,
    totalDaysActive: 0,
  }
}

/**
 * Evaluates streak status against the current date/time, automatically applying
 * "Streak Freeze" if exactly 1 day was missed and a freeze is available for that week.
 *
 * Freeze Mechanism:
 * - 1 freeze allowed per calendar week (resets every Monday / new ISO week).
 * - If user was active 2 days ago (diff === 2), yesterday was missed:
 *   If no freeze was used in yesterday's week, yesterday is protected by freeze!
 *   Streak continuity is maintained without breaking.
 * - If user missed 2 or more days, or already used their weekly freeze, streak resets to 0.
 */
export function evaluateStreakStatus(prevStreak: StreakData, now: Date = new Date()): StreakData {
  const todayStr = formatLocalDate(now)
  const todayWeek = getIsoWeekKey(now)

  // 1. If user has never been active
  if (!prevStreak.lastActiveDate) {
    return {
      ...prevStreak,
      todayCompleted: false,
      freezeAvailable: true,
    }
  }

  // 2. Already active today
  if (prevStreak.lastActiveDate === todayStr) {
    return {
      ...prevStreak,
      todayCompleted: true,
      freezeAvailable: prevStreak.lastFreezeWeek !== todayWeek,
    }
  }

  const diff = getDaysDiff(prevStreak.lastActiveDate, todayStr)

  // Future dates or same day
  if (diff <= 0) {
    return {
      ...prevStreak,
      todayCompleted: true,
      freezeAvailable: prevStreak.lastFreezeWeek !== todayWeek,
    }
  }

  // 3. Active yesterday (diff === 1) -> Streak is active, pending today's practice
  if (diff === 1) {
    return {
      ...prevStreak,
      todayCompleted: false,
      freezeAvailable: prevStreak.lastFreezeWeek !== todayWeek,
    }
  }

  // 4. Missed exactly 1 day (diff === 2: active 2 days ago, missed yesterday)
  if (diff === 2) {
    const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterdayStr = formatLocalDate(yesterdayDate)
    const yesterdayWeek = getIsoWeekKey(yesterdayDate)

    const canUseFreeze =
      prevStreak.currentStreak > 0 &&
      prevStreak.lastFreezeWeek !== yesterdayWeek &&
      !prevStreak.freezeUsedDates.includes(yesterdayStr)

    if (canUseFreeze) {
      // Consume Streak Freeze for yesterday!
      const updatedFreezeDates = [...prevStreak.freezeUsedDates, yesterdayStr]
      return {
        ...prevStreak,
        lastActiveDate: yesterdayStr, // continuity restored by freeze
        freezeUsedDates: updatedFreezeDates,
        lastFreezeWeek: yesterdayWeek,
        freezeAvailable: yesterdayWeek !== todayWeek,
        todayCompleted: false, // still needs to practice today to advance streak
      }
    }

    // Freeze already used this week or streak was 0
    return {
      ...prevStreak,
      currentStreak: 0,
      todayCompleted: false,
      freezeAvailable: prevStreak.lastFreezeWeek !== todayWeek,
    }
  }

  // 5. Missed 2 or more days (diff > 2) -> Streak is broken
  return {
    ...prevStreak,
    currentStreak: 0,
    todayCompleted: false,
    freezeAvailable: prevStreak.lastFreezeWeek !== todayWeek,
  }
}

/**
 * Records completion of at least 1 listening/dictation segment for today.
 * Returns the updated streak data and metadata flags.
 */
export function recordSegmentCompleted(
  prevStreak: StreakData,
  now: Date = new Date()
): { streak: StreakData; justCompleted: boolean; freezeUsed: boolean } {
  const currentStatus = evaluateStreakStatus(prevStreak, now)
  const todayStr = formatLocalDate(now)
  const todayWeek = getIsoWeekKey(now)

  // If already completed today, keep current status
  if (currentStatus.todayCompleted) {
    return {
      streak: currentStatus,
      justCompleted: false,
      freezeUsed: false,
    }
  }

  const prevFreezeCount = prevStreak.freezeUsedDates.length
  const newFreezeCount = currentStatus.freezeUsedDates.length
  const freezeWasUsed = newFreezeCount > prevFreezeCount

  const newCurrentStreak = currentStatus.currentStreak + 1
  const newLongestStreak = Math.max(currentStatus.longestStreak, newCurrentStreak)

  const updatedStreak: StreakData = {
    ...currentStatus,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActiveDate: todayStr,
    todayCompleted: true,
    totalDaysActive: currentStatus.totalDaysActive + 1,
    freezeAvailable: currentStatus.lastFreezeWeek !== todayWeek,
  }

  return {
    streak: updatedStreak,
    justCompleted: true,
    freezeUsed: freezeWasUsed,
  }
}

