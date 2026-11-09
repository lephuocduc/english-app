import React from 'react'
import { Flame, Snowflake, Check } from 'lucide-react'
import type { StreakData } from '../types'

interface DailyStreakBadgeProps {
  streak: StreakData
  onClick: () => void
}

export const DailyStreakBadge: React.FC<DailyStreakBadgeProps> = ({ streak, onClick }) => {
  const isCompletedToday = streak.todayCompleted
  const hasStreak = streak.currentStreak > 0

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        isCompletedToday
          ? `Chuỗi học tập: ${streak.currentStreak} ngày liên tục! Hôm nay đã hoàn thành.`
          : `Chuỗi học tập: ${streak.currentStreak} ngày liên tục. Hoàn thành 1 đoạn nghe hôm nay để giữ chuỗi!`
      }
      aria-label={`Daily streak: ${streak.currentStreak} days`}
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer relative group ${
        isCompletedToday
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-xs'
          : hasStreak
          ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/40'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60 hover:text-orange-600 dark:hover:text-orange-400'
      }`}
    >
      {/* Flame Icon with dynamic glow */}
      <div className="relative flex items-center justify-center">
        <Flame
          className={`w-4 h-4 transition-transform group-hover:scale-115 ${
            isCompletedToday
              ? 'text-amber-500 fill-amber-500 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : hasStreak
              ? 'text-orange-500 fill-orange-400/50'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        />
        {/* Little check indicator if completed today */}
        {isCompletedToday && (
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[7px] font-black">
            <Check className="w-2 h-2 stroke-[3]" />
          </span>
        )}
      </div>

      {/* Streak Number */}
      <span className="font-extrabold font-mono tracking-tight text-xs sm:text-sm">
        {streak.currentStreak}
      </span>

      {/* Streak Freeze Badge Indicator if available */}
      {streak.freezeAvailable && (
        <span
          title="Streak Freeze sẵn sàng (cho phép nghỉ 1 ngày trong tuần mà không mất chuỗi)"
          className="inline-flex items-center text-[10px] text-cyan-600 dark:text-cyan-400"
        >
          <Snowflake className="w-3 h-3 text-cyan-500" />
        </span>
      )}
    </button>
  )
}

