import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  Flame,
  Calendar,
  BarChart3,
} from 'lucide-react'
import type { FirstAttemptRecord, Lesson, UserLessonProgress } from '../../types'
import { apiClient } from '../../lib/api/client'
import {
  computeFirstAttemptAnalytics,
  extractLocalFirstAttempts,
  mergeFirstAttemptRecords,
  type ProgressPeriodMode,
} from '../../lib/progress/firstAttemptAnalytics'

interface ProgressViewProps {
  lessons: Lesson[]
  allProgressMap: Record<string, UserLessonProgress>
  onResetAllProgress: () => void
  onNavigateToPractice: () => void
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  lessons,
  allProgressMap,
  onResetAllProgress,
  onNavigateToPractice,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [periodMode, setPeriodMode] = useState<ProgressPeriodMode>('weekly')
  const [cloudFirstAttempts, setCloudFirstAttempts] = useState<FirstAttemptRecord[]>([])

  useEffect(() => {
    let active = true
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      apiClient
        .getFirstAttemptRecords()
        .then((rows) => {
          if (active && Array.isArray(rows)) {
            setCloudFirstAttempts(rows)
          }
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [allProgressMap])

  const mergedFirstAttempts = useMemo(() => {
    const local = extractLocalFirstAttempts(allProgressMap)
    return mergeFirstAttemptRecords(local, cloudFirstAttempts)
  }, [allProgressMap, cloudFirstAttempts])

  const firstAttemptAnalytics = useMemo(
    () => computeFirstAttemptAnalytics(mergedFirstAttempts, periodMode, 8),
    [mergedFirstAttempts, periodMode]
  )

  const firstAttemptByLesson = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()
    for (const rec of mergedFirstAttempts) {
      const cur = map.get(rec.lessonId)
      if (cur) {
        cur.sum += rec.score
        cur.count += 1
      } else {
        map.set(rec.lessonId, { sum: rec.score, count: 1 })
      }
    }
    return map
  }, [mergedFirstAttempts])

  // Calculate statistics across all lessons
  let totalSentencesAttempted = 0
  let totalScoreSum = 0
  let totalScoreCount = 0
  let totalCompletedSentences = 0
  let totalCompletedLessons = 0

  lessons.forEach((lesson) => {
    const prog = allProgressMap[lesson.id]
    if (!prog) return

    let lessonCompletedCount = 0
    lesson.sentences.forEach((s) => {
      const sp = prog.sentenceProgress[s.id]
      if (sp) {
        if (sp.attempts > 0 || sp.userInput) {
          totalSentencesAttempted++
        }
        if (typeof sp.score === 'number') {
          totalScoreSum += sp.score
          totalScoreCount++
        }
        if (sp.completed || sp.score >= 80) {
          totalCompletedSentences++
          lessonCompletedCount++
        }
      }
    })

    if (lesson.sentences.length > 0 && lessonCompletedCount === lesson.sentences.length) {
      totalCompletedLessons++
    }
  })

  const averageScore =
    totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0

  const hasAnyProgress = totalSentencesAttempted > 0

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Learning Analytics</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Progress &amp; Training Results
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Summary of your dictation practice data saved securely in your browser.
          </p>
        </div>

        {hasAnyProgress && (
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Progress</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal for Reset */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Reset Learning Progress?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                All scores, typed sentence history, and locally saved progress will be cleared.
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllProgress()
                  setShowConfirmReset(false)
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sentences Attempted */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Sentences Practiced
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalSentencesAttempted}
            </span>
          </div>
        </div>

        {/* Card 2: Average First-Attempt Score */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {firstAttemptAnalytics.totalCount > 0 ? 'First-Attempt Avg' : 'Avg Word Similarity'}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {firstAttemptAnalytics.totalCount > 0
                ? `${firstAttemptAnalytics.overallAvg}%`
                : `${averageScore}%`}
            </span>
          </div>
        </div>

        {/* Card 3: Completed Sentences */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Passed Sentences (≥80%)
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalCompletedSentences}
            </span>
          </div>
        </div>

        {/* Card 4: Completed Lessons */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Completed Lessons
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalCompletedLessons}/{lessons.length}
            </span>
          </div>
        </div>
      </div>

      {/* First-Attempt Score Progress Chart (Weekly / Monthly Comparison) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tiến bộ điểm chấm lần đầu (First-Attempt Progress)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chỉ tính điểm lần chấm đầu tiên của mỗi câu để phản ánh đúng năng lực nghe thực tế
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Chọn kỳ so sánh"
            className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
          >
            <button
              type="button"
              onClick={() => setPeriodMode('weekly')}
              aria-pressed={periodMode === 'weekly'}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                periodMode === 'weekly'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hàng tuần
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('monthly')}
              aria-pressed={periodMode === 'monthly'}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hàng tháng
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {firstAttemptAnalytics.periods.length === 0 ? (
            <div className="py-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 space-y-1">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Chưa có dữ liệu điểm lần chấm đầu tiên
              </p>
              <p>Hoàn thành các câu nghe trong tab Practice để xem biểu đồ tiến bộ theo tuần và tháng.</p>
            </div>
          ) : (
            <>
              {/* Current vs Previous Period Comparison Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 block">
                    {periodMode === 'weekly' ? 'Tuần gần nhất' : 'Tháng gần nhất'} (
                    {firstAttemptAnalytics.currentPeriod?.label})
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold font-mono text-indigo-950 dark:text-white">
                      {firstAttemptAnalytics.currentPeriod?.avgScore}%
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      ({firstAttemptAnalytics.currentPeriod?.count} câu)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    {periodMode === 'weekly' ? 'Tuần trước đó' : 'Tháng trước đó'}
                    {firstAttemptAnalytics.previousPeriod
                      ? ` (${firstAttemptAnalytics.previousPeriod.label})`
                      : ''}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                      {firstAttemptAnalytics.previousPeriod
                        ? `${firstAttemptAnalytics.previousPeriod.avgScore}%`
                        : '—'}
                    </span>
                    {firstAttemptAnalytics.previousPeriod && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        ({firstAttemptAnalytics.previousPeriod.count} câu)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    So sánh tiến bộ
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {firstAttemptAnalytics.delta === null ? (
                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                        Cần ít nhất 2 {periodMode === 'weekly' ? 'tuần' : 'tháng'}
                      </span>
                    ) : firstAttemptAnalytics.delta > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                        <span>+{firstAttemptAnalytics.delta}%</span>
                      </span>
                    ) : firstAttemptAnalytics.delta < 0 ? (
                      <span className="inline-flex items-center gap-1 text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                        <TrendingDown className="w-5 h-5" />
                        <span>{firstAttemptAnalytics.delta}%</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xl font-extrabold font-mono text-slate-600 dark:text-slate-300">
                        <Minus className="w-5 h-5" />
                        <span>0%</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bar Chart across Periods */}
              <div className="pt-2">
                <div className="flex items-end justify-between gap-2 sm:gap-4 h-44 px-2 pt-6 pb-2 bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {firstAttemptAnalytics.periods.map((bucket, idx) => {
                    const isLatest = idx === firstAttemptAnalytics.periods.length - 1
                    const barHeight = Math.max(8, Math.min(100, Math.round(bucket.avgScore)))
                    return (
                      <div
                        key={bucket.key}
                        className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                      >
                        <div className="text-center mb-1">
                          <span
                            className={`text-xs font-extrabold font-mono block ${
                              isLatest
                                ? 'text-indigo-700 dark:text-indigo-300'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {bucket.avgScore}%
                          </span>
                          {bucket.deltaFromPrev !== null && (
                            <span
                              className={`text-[10px] font-bold font-mono ${
                                bucket.deltaFromPrev > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : bucket.deltaFromPrev < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {bucket.deltaFromPrev > 0
                                ? `+${bucket.deltaFromPrev}%`
                                : `${bucket.deltaFromPrev}%`}
                            </span>
                          )}
                        </div>
                        <div className="w-full max-w-12 h-24 bg-slate-200/70 dark:bg-slate-800 rounded-t-xl flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-t-xl transition-all duration-500 ${
                              isLatest
                                ? 'bg-gradient-to-t from-indigo-600 to-violet-500'
                                : 'bg-indigo-400/75 dark:bg-indigo-500/60'
                            }`}
                            style={{ height: `${barHeight}%` }}
                            title={`${bucket.label} (${bucket.subLabel}): ${bucket.avgScore}% từ ${bucket.count} câu`}
                          />
                        </div>
                        <div className="mt-1.5 text-center leading-tight">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {bucket.label}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                            {bucket.count} câu
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lesson-by-lesson Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lesson Breakdown</h3>
        </div>

        {!hasAnyProgress ? (
          <div className="p-10 text-center space-y-3">
            <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              You have no practice sessions yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Head over to the Practice tab or select a lesson to start your first dictation session!
            </p>
            <button
              type="button"
              onClick={onNavigateToPractice}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              Start Practicing Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {lessons.map((lesson) => {
              const prog = allProgressMap[lesson.id]
              const total = lesson.sentences.length
              const completed = lesson.sentences.filter(
                (s) => (prog?.sentenceProgress[s.id]?.score ?? 0) >= 80
              ).length
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0

              let lessonScoreSum = 0
              let lessonScoreCount = 0
              lesson.sentences.forEach((s) => {
                const sp = prog?.sentenceProgress[s.id]
                if (sp && typeof sp.score === 'number') {
                  lessonScoreSum += sp.score
                  lessonScoreCount++
                }
              })
              const lessonAvg =
                lessonScoreCount > 0 ? Math.round(lessonScoreSum / lessonScoreCount) : 0

              return (
                <div
                  key={lesson.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-md">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {lesson.level}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{lesson.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {completed}/{total} sentences completed ({percent}%)
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    {(() => {
                      const firstStats = firstAttemptByLesson.get(lesson.id)
                      if (!firstStats || firstStats.count === 0) return null
                      const firstAvg = Math.round(firstStats.sum / firstStats.count)
                      return (
                        <div className="text-right">
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 block">
                            Lần đầu TB
                          </span>
                          <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                            {firstAvg}%
                          </span>
                        </div>
                      )
                    })()}

                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Average Score</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {lessonScoreCount > 0 ? `${lessonAvg}%` : 'N/A'}
                      </span>
                    </div>

                    <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
