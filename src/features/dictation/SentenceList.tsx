import React, { useEffect, useRef } from 'react'
import { CheckCircle2, Clock, Volume2 } from 'lucide-react'
import type { SentenceSegment, UserSentenceProgress } from '../../types'

interface SentenceListProps {
  sentences: SentenceSegment[]
  activeSegmentIndex: number
  isPlaying?: boolean
  onSelectSegment: (index: number) => void
  savedProgressMap: Record<string, UserSentenceProgress>
}

export const SentenceList: React.FC<SentenceListProps> = ({
  sentences,
  activeSegmentIndex,
  isPlaying = false,
  onSelectSegment,
  savedProgressMap,
}) => {
  const activeItemRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll active segment inside its own container without scrolling the page window/viewport
  useEffect(() => {
    if (containerRef.current && activeItemRef.current) {
      const container = containerRef.current
      const item = activeItemRef.current

      const containerRect = container.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()

      if (itemRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - itemRect.top + 8
      } else if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += itemRect.bottom - containerRect.bottom + 8
      }
    }
  }, [activeSegmentIndex])

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (index < sentences.length - 1) onSelectSegment(index + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (index > 0) onSelectSegment(index - 1)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Practice Sentences
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select any sentence to listen and transcribe
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
          {sentences.length} segments
        </span>
      </div>

      {sentences.length === 0 ? (
        <div className="p-6 text-center space-y-1.5 text-slate-500 dark:text-slate-400">
          <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">No sentence segments yet</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Auto-fetch from YouTube or paste a transcript in the studio to start practicing.
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          role="region"
          aria-label="List of practice sentences"
          className="max-h-[360px] lg:max-h-[520px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-1.5 space-y-1 focus:outline-none"
        >
        {sentences.map((seg, idx) => {
          const isActive = idx === activeSegmentIndex
          const progress = savedProgressMap[seg.id]
          const isCompleted = progress?.completed
          const hasScore = typeof progress?.score === 'number'
          const duration = (seg.endTime - seg.startTime).toFixed(1)

          return (
            <button
              key={seg.id}
              ref={isActive ? activeItemRef : null}
              type="button"
              onClick={() => onSelectSegment(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              aria-current={isActive ? 'true' : undefined}
              className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                isActive
                  ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200/70 dark:ring-indigo-900/50 text-indigo-950 dark:text-indigo-100 shadow-xs font-medium'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
              }`}
            >
              {/* Index Number / Status indicator */}
              <div className="shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Segment summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      ({duration}s)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {isActive && isPlaying && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Playing
                      </span>
                    )}

                    {hasScore && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          progress.score >= 80
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : progress.score >= 50
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {progress.score}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Masked / Hint preview */}
                <p
                  className={`text-xs line-clamp-1 ${
                    isActive ? 'text-indigo-950 dark:text-indigo-200 font-semibold' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {progress?.isRevealed ? (
                    seg.text
                  ) : progress?.userInput ? (
                    <span className="italic text-slate-500 dark:text-slate-400">
                      Typed: &quot;{progress.userInput}&quot;
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">••• Click to listen to this sentence •••</span>
                  )}
                </p>
              </div>

              {isActive && (
                <div className="shrink-0 self-center pl-1 text-indigo-600 dark:text-indigo-400">
                  <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce text-emerald-600 dark:text-emerald-400' : ''}`} />
                </div>
              )}
            </button>
          )
        })}
        </div>
      )}
    </div>
  )
}
