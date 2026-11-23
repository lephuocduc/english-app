import type { FirstAttemptRecord, UserLessonProgress } from '../../types'
import { getIsoWeekKey } from '../streak/streakManager'

export type ProgressPeriodMode = 'weekly' | 'monthly'

export interface PeriodScoreBucket {
  key: string
  label: string
  subLabel: string
  avgScore: number
  count: number
  deltaFromPrev: number | null
}

export interface FirstAttemptAnalyticsSummary {
  overallAvg: number
  totalCount: number
  periods: PeriodScoreBucket[]
  currentPeriod: PeriodScoreBucket | null
  previousPeriod: PeriodScoreBucket | null
  delta: number | null
}

/**
 * Safely parses SQLite UTC timestamps ("YYYY-MM-DD HH:MM:SS") or ISO strings into a Date.
 */
export function parseAttemptTimestamp(raw?: string | null): Date | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // SQLite datetime('now') produces "YYYY-MM-DD HH:MM:SS" (UTC)
  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
      ? `${trimmed.replace(' ', 'T')}Z`
      : trimmed
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Extracts first-attempt records from local UserLessonProgress map.
 * Uses explicit `firstAttemptScore` when present, or falls back to `score`
 * for sentences that only have 1 recorded attempt.
 */
export function extractLocalFirstAttempts(
  allProgressMap: Record<string, UserLessonProgress>
): FirstAttemptRecord[] {
  const records: FirstAttemptRecord[] = []
  for (const [lessonId, prog] of Object.entries(allProgressMap || {})) {
    if (!prog?.sentenceProgress) continue
    for (const [segmentId, sp] of Object.entries(prog.sentenceProgress)) {
      if (!sp) continue
      const hasExplicitFirst = typeof sp.firstAttemptScore === 'number'
      const isSingleAttempt = !hasExplicitFirst && sp.attempts === 1 && typeof sp.score === 'number'
      if (!hasExplicitFirst && !isSingleAttempt) continue

      const score = hasExplicitFirst ? sp.firstAttemptScore! : sp.score
      const createdAt = sp.firstAttemptAt || sp.lastAttemptAt || prog.updatedAt
      if (typeof score === 'number' && createdAt) {
        records.push({
          lessonId,
          segmentId,
          score: Math.max(0, Math.min(100, Math.round(score))),
          createdAt,
        })
      }
    }
  }
  return records
}

/**
 * Merges local and cloud first-attempt records, deduplicating per (lessonId, segmentId)
 * and keeping the earliest recorded attempt.
 */
export function mergeFirstAttemptRecords(
  localRecords: FirstAttemptRecord[],
  cloudRecords: FirstAttemptRecord[]
): FirstAttemptRecord[] {
  const byKey = new Map<string, FirstAttemptRecord>()

  const upsert = (rec: FirstAttemptRecord) => {
    const key = `${rec.lessonId}:::${rec.segmentId}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, rec)
      return
    }
    const existingTime = parseAttemptTimestamp(existing.createdAt)?.getTime() ?? Infinity
    const nextTime = parseAttemptTimestamp(rec.createdAt)?.getTime() ?? Infinity
    if (nextTime < existingTime) {
      byKey.set(key, rec)
    }
  }

  for (const rec of cloudRecords) upsert(rec)
  for (const rec of localRecords) upsert(rec)

  return Array.from(byKey.values()).sort((a, b) => {
    const ta = parseAttemptTimestamp(a.createdAt)?.getTime() ?? 0
    const tb = parseAttemptTimestamp(b.createdAt)?.getTime() ?? 0
    return ta - tb
  })
}

function getMondayOfDate(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function formatShortDayMonth(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}`
}

function getWeekBucketMeta(date: Date): { key: string; label: string; subLabel: string } {
  const key = getIsoWeekKey(date) // e.g. "2026-W48"
  const monday = getMondayOfDate(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekNum = key.split('-')[1] || key
  return {
    key,
    label: `Tuần ${weekNum.replace('W', '')}`,
    subLabel: `${formatShortDayMonth(monday)} – ${formatShortDayMonth(sunday)}`,
  }
}

function getMonthBucketMeta(date: Date): { key: string; label: string; subLabel: string } {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return {
    key: `${y}-${m}`,
    label: `Tháng ${Number(m)}`,
    subLabel: `${m}/${y}`,
  }
}

/**
 * Computes weekly or monthly first-attempt average score analytics and period-over-period delta.
 */
export function computeFirstAttemptAnalytics(
  records: FirstAttemptRecord[],
  mode: ProgressPeriodMode,
  maxPeriods = 8
): FirstAttemptAnalyticsSummary {
  if (!records || records.length === 0) {
    return {
      overallAvg: 0,
      totalCount: 0,
      periods: [],
      currentPeriod: null,
      previousPeriod: null,
      delta: null,
    }
  }

  let totalSum = 0
  let totalCount = 0
  const bucketMap = new Map<
    string,
    { key: string; label: string; subLabel: string; sum: number; count: number }
  >()

  for (const rec of records) {
    if (typeof rec.score !== 'number' || Number.isNaN(rec.score)) continue
    const dt = parseAttemptTimestamp(rec.createdAt)
    if (!dt) continue

    totalSum += rec.score
    totalCount += 1

    const meta = mode === 'weekly' ? getWeekBucketMeta(dt) : getMonthBucketMeta(dt)
    const existing = bucketMap.get(meta.key)
    if (existing) {
      existing.sum += rec.score
      existing.count += 1
    } else {
      bucketMap.set(meta.key, {
        ...meta,
        sum: rec.score,
        count: 1,
      })
    }
  }

  const sortedRaw = Array.from(bucketMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-maxPeriods)

  const periods: PeriodScoreBucket[] = sortedRaw.map((b, idx) => {
    const avgScore = Math.round((b.sum / b.count) * 10) / 10
    const prevAvg =
      idx > 0 ? Math.round((sortedRaw[idx - 1].sum / sortedRaw[idx - 1].count) * 10) / 10 : null
    const deltaFromPrev =
      prevAvg !== null ? Math.round((avgScore - prevAvg) * 10) / 10 : null
    return {
      key: b.key,
      label: b.label,
      subLabel: b.subLabel,
      avgScore,
      count: b.count,
      deltaFromPrev,
    }
  })

  const currentPeriod = periods.length > 0 ? periods[periods.length - 1] : null
  const previousPeriod = periods.length > 1 ? periods[periods.length - 2] : null
  const delta =
    currentPeriod && previousPeriod
      ? Math.round((currentPeriod.avgScore - previousPeriod.avgScore) * 10) / 10
      : null

  return {
    overallAvg: totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0,
    totalCount,
    periods,
    currentPeriod,
    previousPeriod,
    delta,
  }
}
