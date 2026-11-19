import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  AlignLeft,
  List,
  Languages,
  Volume2,
  BookmarkPlus,
} from 'lucide-react'
import type { Lesson, SentenceSegment, UserSentenceProgress } from '../../types'
import { cleanWord } from '../../lib/translation/translator'

interface CompletedLessonTranscriptProps {
  lesson: Lesson
  activeSegmentIndex: number
  isPlaying?: boolean
  savedProgressMap: Record<string, UserSentenceProgress>
  onSelectSegment: (index: number) => void
  onBookmarkVocabulary?: (
    word: string,
    contextSentence: string,
    timestamp: number,
    meaning?: string,
    contextSentenceTranslation?: string
  ) => void
}

function formatTime(secs: number): string {
  const mins = Math.floor(secs / 60)
  const rem = Math.floor(secs % 60)
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`
}

export const CompletedLessonTranscript: React.FC<CompletedLessonTranscriptProps> = ({
  lesson,
  activeSegmentIndex,
  isPlaying = false,
  savedProgressMap,
  onSelectSegment,
  onBookmarkVocabulary,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<'lines' | 'passage'>('lines')
  const [showTranslation, setShowTranslation] = useState(true)
  const [copied, setCopied] = useState(false)
  const [savedWordNotice, setSavedWordNotice] = useState<string | null>(null)

  const copyTimerRef = useRef<number | null>(null)
  const noticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    }
  }, [])

  const { totalSentences, completedCount, avgScore, fullEnglishPassage } = useMemo(() => {
    const sentences = lesson.sentences || []
    const total = sentences.length
    const completed = sentences.filter((s) =>
      Boolean(savedProgressMap[s.id]?.completed || (savedProgressMap[s.id]?.score ?? 0) >= 80)
    ).length
    const scores = sentences
      .map((s) => savedProgressMap[s.id]?.score)
      .filter((score): score is number => typeof score === 'number')
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((sum, sc) => sum + sc, 0) / scores.length)
        : 100
    const passage = sentences.map((s) => s.text.trim()).filter(Boolean).join(' ')
    return {
      totalSentences: total,
      completedCount: completed,
      avgScore: avg,
      fullEnglishPassage: passage,
    }
  }, [lesson.sentences, savedProgressMap])

  const handleCopy = async () => {
    const content =
      viewMode === 'passage'
        ? fullEnglishPassage
        : lesson.sentences
            .map((s) => s.text.trim())
            .filter(Boolean)
            .join('\n')

    try {
      await navigator.clipboard?.writeText(content)
      setCopied(true)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors in restricted environments
    }
  }

  const handleBookmarkToken = (cleaned: string, seg: SentenceSegment) => {
    if (!cleaned || !onBookmarkVocabulary) return
    onBookmarkVocabulary(cleaned, seg.text, seg.startTime, undefined, seg.translation)
    setSavedWordNotice(cleaned)
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setSavedWordNotice(null), 2200)
  }

  const hasAnyTranslation = useMemo(
    () => lesson.sentences.some((s) => Boolean(s.translation?.trim())),
    [lesson.sentences]
  )

  return (
    <section
      id="full-transcript-review"
      aria-label="Full Transcript Review"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 shadow-sm overflow-hidden transition-colors"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-white dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900 border-b border-emerald-100 dark:border-emerald-900/60 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Bài học đã hoàn thành • Full Transcript</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {lesson.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {completedCount}/{totalSentences} câu đạt ≥80% • Điểm TB: {avgScore}%
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shrink-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Mở rộng</span>
              </>
            )}
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('lines')}
              aria-pressed={viewMode === 'lines'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'lines'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Từng câu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('passage')}
              aria-pressed={viewMode === 'passage'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'passage'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Đoạn văn liền</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasAnyTranslation && (
              <button
                type="button"
                onClick={() => setShowTranslation((prev) => !prev)}
                aria-pressed={showTranslation}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  showTranslation
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{showTranslation ? 'Ẩn dịch' : 'Hiện dịch'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-3">
          {savedWordNotice && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl">
              <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Đã lưu &quot;{savedWordNotice}&quot; vào Sổ từ vựng</span>
            </div>
          )}

          {viewMode === 'lines' ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {lesson.sentences.map((seg, idx) => {
                const isActive = idx === activeSegmentIndex
                const score = savedProgressMap[seg.id]?.score
                const hasScore = typeof score === 'number'
                const tokens = seg.text.trim().split(/(\s+)/)

                return (
                  <div
                    key={seg.id}
                    className={`py-3 first:pt-1 last:pb-1 px-2.5 -mx-2.5 rounded-xl transition ${
                      isActive
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectSegment(idx)}
                        aria-label={`Nghe câu ${idx + 1}`}
                        title={`Nghe lại câu #${idx + 1}`}
                        className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                        }`}
                      >
                        <Volume2
                          className={`w-4 h-4 ${isActive && isPlaying ? 'animate-pulse' : ''}`}
                        />
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              #{idx + 1}
                            </span>
                            <span>
                              {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                            </span>
                          </div>

                          {hasScore && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                score >= 80
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : score >= 50
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {score}%
                            </span>
                          )}
                        </div>

                        {onBookmarkVocabulary ? (
                          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 font-medium">
                            {tokens.map((tok, tokIdx) => {
                              if (/^\s+$/.test(tok)) {
                                return <span key={tokIdx}>{tok}</span>
                              }
                              const cleaned = cleanWord(tok)
                              if (!cleaned) {
                                return <span key={tokIdx}>{tok}</span>
                              }
                              return (
                                <button
                                  key={tokIdx}
                                  type="button"
                                  onClick={() => handleBookmarkToken(cleaned, seg)}
                                  title={`Lưu "${cleaned}" vào Sổ từ vựng`}
                                  className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline decoration-indigo-400/70 underline-offset-2 rounded transition cursor-pointer inline"
                                >
                                  {tok}
                                </button>
                              )
                            })}
                          </p>
                        ) : (
                          <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 font-medium">
                            {seg.text}
                          </p>
                        )}

                        {showTranslation && seg.translation && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {seg.translation}
                          </p>
                        )}

                        {seg.hint && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300/90 font-medium">
                            Từ khóa: {seg.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80">
                <p
                  data-testid="full-transcript-passage"
                  className="text-sm sm:text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 font-medium"
                >
                  {fullEnglishPassage}
                </p>
              </div>

              {showTranslation && hasAnyTranslation && (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                    Bản dịch toàn bài
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {lesson.sentences.map(
                      (seg) =>
                        seg.translation && (
                          <p key={seg.id}>{seg.translation}</p>
                        )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
