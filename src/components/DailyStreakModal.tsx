import React from 'react'
import {
  Flame,
  Snowflake,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Trophy,
  Calendar,
  X,
  Zap,
} from 'lucide-react'
import type { StreakData } from '../types'

interface DailyStreakModalProps {
  isOpen: boolean
  onClose: () => void
  streak: StreakData
  onStartPractice?: () => void
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({
  isOpen,
  onClose,
  streak,
  onStartPractice,
}) => {
  if (!isOpen) return null

  const isCompletedToday = streak.todayCompleted
  const recentFreezeDate =
    streak.freezeUsedDates.length > 0
      ? streak.freezeUsedDates[streak.freezeUsedDates.length - 1]
      : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header decoration banner */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 px-6 pt-8 pb-12 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/90 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Duolingo-style flame presentation */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 mb-3 animate-bounce">
            <Flame className="w-12 h-12 text-amber-200 fill-amber-300 drop-shadow-md" />
          </div>

          <h2 id="streak-modal-title" className="text-3xl font-black tracking-tight text-white">
            {streak.currentStreak}{' '}
            <span className="text-xl font-bold text-amber-100">Ngày Liên Tục</span>
          </h2>
          <p className="text-xs text-amber-100/90 font-medium mt-1">
            Chỉ cần 1 đoạn nghe mỗi ngày để duy trì thói quen luyện tiếng Anh!
          </p>
        </div>

        {/* Content body */}
        <div className="px-6 py-5 -mt-6 bg-white dark:bg-slate-900 rounded-t-3xl relative z-10 space-y-4">
          {/* Daily Goal Status Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition ${isCompletedToday
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              }`}
          >
            {isCompletedToday ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {isCompletedToday ? 'Mục tiêu hôm nay: Đã hoàn thành 🎉' : 'Mục tiêu hôm nay: Chưa hoàn thành'}
              </div>
              <p className="text-xs mt-0.5 text-slate-600 dark:text-slate-300">
                {isCompletedToday
                  ? 'Bạn đã hoàn thành ít nhất 1 đoạn nghe hôm nay. Chuỗi ngày được bảo toàn và lưu vào cơ sở dữ liệu!'
                  : 'Chỉ cần nghe và hoàn thành đúng 1 đoạn nghe là chuỗi của bạn sẽ được giữ và tăng thêm 1 ngày!'}
              </p>
            </div>
          </div>

          {/* Streak Freeze Feature Card */}
          <div className="p-3.5 rounded-xl border border-cyan-200/80 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50/80 to-blue-50/40 dark:from-cyan-950/30 dark:to-blue-950/20">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0">
                <Snowflake className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-cyan-950 dark:text-cyan-200 uppercase tracking-wider">
                Cơ chế &quot;Streak Freeze&quot; (Bảo vệ chuỗi)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cho phép bạn nghỉ <strong>1 ngày trong tuần</strong> mà không bị mất chuỗi, giúp bạn an tâm nghỉ ngơi khi bận rộn mà không lo tâm lý <em>&quot;đứt chuỗi là bỏ luôn&quot;</em>.
            </p>

            <div className="mt-2.5 pt-2 border-t border-cyan-200/60 dark:border-cyan-800/50 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Trạng thái tuần này:
              </span>
              {streak.freezeAvailable ? (
                <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 rounded-md font-bold text-[11px]">
                  ❄️ Sẵn sàng (1 lượt/tuần)
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-md font-bold text-[11px]">
                  🛡️ Đã dùng {recentFreezeDate ? `(ngày ${recentFreezeDate})` : 'tuần này'}
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Kỷ lục chuỗi</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {streak.longestStreak}{' '}
                <span className="text-xs font-semibold text-slate-500">ngày</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tổng ngày học</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {streak.totalDaysActive}{' '}
                <span className="text-xs font-semibold text-slate-500">ngày</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            {!isCompletedToday && onStartPractice && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onStartPractice()
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Luyện 1 đoạn nghe ngay</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${isCompletedToday ? 'w-full' : ''
                }`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}