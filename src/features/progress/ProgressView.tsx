import React, { useState } from 'react'
import {
  TrendingUp,
  Award,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  Flame,
} from 'lucide-react'
import type { Lesson, UserLessonProgress } from '../../types'

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
            <span>Thống kê học tập</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Tiến độ &amp; Kết quả rèn luyện
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Tổng hợp dữ liệu bài tập chép chính tả được lưu an toàn trên trình duyệt của bạn.
          </p>
        </div>

        {hasAnyProgress && (
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại toàn bộ tiến độ</span>
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
                Xác nhận xóa tiến độ học tập?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Toàn bộ điểm số, lịch sử gõ câu và từ vựng đã lưu trong bộ nhớ máy sẽ được xóa sạch.
                Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllProgress()
                  setShowConfirmReset(false)
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer"
              >
                Đồng ý xóa
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
              Câu đã luyện tập
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalSentencesAttempted}
            </span>
          </div>
        </div>

        {/* Card 2: Average Score */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Điểm TB tương đồng
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {averageScore}%
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
              Câu đạt chuẩn (≥80%)
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
              Bài học hoàn thành
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {totalCompletedLessons}/{lessons.length}
            </span>
          </div>
        </div>
      </div>

      {/* Lesson-by-lesson Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chi tiết theo từng bài học</h3>
        </div>

        {!hasAnyProgress ? (
          <div className="p-10 text-center space-y-3">
            <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Bạn chưa có buổi luyện nghe nào
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Hãy chuyển sang tab Luyện tập hoặc chọn một bài học có sẵn để bắt đầu chép chính tả câu đầu tiên!
            </p>
            <button
              type="button"
              onClick={onNavigateToPractice}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              Bắt đầu luyện tập ngay
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
                      {completed}/{total} câu hoàn thành ({percent}%)
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Điểm trung bình</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {lessonScoreCount > 0 ? `${lessonAvg}%` : 'Chưa có'}
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
