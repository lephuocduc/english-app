import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Volume2,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Trophy,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type { VocabularyItem, SRSRating } from '../../types'
import {
  calculateNextReview,
  getIntervalPreviewText,
  speakWord,
  createClozeSentence,
} from '../../lib/srs/sm2'

interface FlashcardReviewModalProps {
  isOpen: boolean
  onClose: () => void
  itemsToReview: VocabularyItem[]
  onUpdateVocabulary: (updated: VocabularyItem) => void
  onJumpToTimestamp?: (videoId: string, timestamp: number) => void
}

export const FlashcardReviewModal: React.FC<FlashcardReviewModalProps> = ({
  isOpen,
  onClose,
  itemsToReview,
  onUpdateVocabulary,
  onJumpToTimestamp,
}) => {
  const [queue, setQueue] = useState<VocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isCloze, setIsCloze] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  // Track session stats
  const [stats, setStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    totalReviewed: 0,
  })
  const [missedItems, setMissedItems] = useState<VocabularyItem[]>([])

  // Reset or initialize session queue when opened
  useEffect(() => {
    if (isOpen && itemsToReview.length > 0) {
      setQueue([...itemsToReview])
      setCurrentIndex(0)
      setIsFlipped(false)
      setIsComplete(false)
      setStats({ again: 0, hard: 0, good: 0, easy: 0, totalReviewed: 0 })
      setMissedItems([])
    }
  }, [isOpen, itemsToReview])

  const currentCard: VocabularyItem | undefined = queue[currentIndex]

  // Auto-pronounce word when moving to a new card
  useEffect(() => {
    if (isOpen && currentCard && !isComplete && autoSpeak) {
      const timer = setTimeout(() => {
        speakWord(currentCard.word)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentCard, isComplete, autoSpeak])

  // Trigger celebration confetti on completion
  useEffect(() => {
    if (isComplete) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
        })
      } catch {
        // ignore in test or unsupported env
      }
    }
  }, [isComplete])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleRating = useCallback(
    (rating: SRSRating) => {
      if (!currentCard) return

      const updateResult = calculateNextReview(currentCard, rating)
      const updatedItem: VocabularyItem = {
        ...currentCard,
        ...updateResult,
      }

      onUpdateVocabulary(updatedItem)

      // Update session statistics
      setStats((prev) => ({
        ...prev,
        again: prev.again + (rating === 1 ? 1 : 0),
        hard: prev.hard + (rating === 2 ? 1 : 0),
        good: prev.good + (rating === 3 ? 1 : 0),
        easy: prev.easy + (rating === 4 ? 1 : 0),
        totalReviewed: prev.totalReviewed + 1,
      }))

      if (rating === 1) {
        setMissedItems((prev) => [...prev, updatedItem])
      }

      // Proceed to next card or complete session
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1)
        setIsFlipped(false)
      } else {
        setIsComplete(true)
      }
    },
    [currentCard, currentIndex, queue.length, onUpdateVocabulary]
  )

  const handleReviewMissedCards = () => {
    if (missedItems.length === 0) return
    setQueue([...missedItems])
    setCurrentIndex(0)
    setIsFlipped(false)
    setIsComplete(false)
    setMissedItems([])
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (isComplete) return

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        handleFlip()
      } else if (isFlipped) {
        if (e.key === '1') {
          e.preventDefault()
          handleRating(1)
        } else if (e.key === '2') {
          e.preventDefault()
          handleRating(2)
        } else if (e.key === '3') {
          e.preventDefault()
          handleRating(3)
        } else if (e.key === '4') {
          e.preventDefault()
          handleRating(4)
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (currentCard) {
          e.preventDefault()
          speakWord(currentCard.word)
        }
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setIsCloze((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isOpen,
    isComplete,
    isFlipped,
    currentCard,
    handleFlip,
    handleRating,
    onClose,
  ])

  if (!isOpen) return null

  const progressPercent =
    queue.length > 0 ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcard-modal-title"
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in select-none"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="flashcard-modal-title"
                className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"
              >
                <span>Flashcard Review (Anki SRS)</span>
                {currentCard?.mastered && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                    Mastered
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Spaced repetition via SuperMemo SM-2 algorithm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Auto speak toggle */}
            <button
              type="button"
              onClick={() => setAutoSpeak((prev) => !prev)}
              title={autoSpeak ? 'Auto-pronounce: ON' : 'Auto-pronounce: OFF'}
              className={`p-1.5 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 ${
                autoSpeak
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Auto-play</span>
            </button>

            {/* Cloze test toggle */}
            <button
              type="button"
              onClick={() => setIsCloze((prev) => !prev)}
              title={isCloze ? 'Cloze test: ON' : 'Cloze test: OFF'}
              className={`p-1.5 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 ${
                isCloze
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isCloze ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px] font-medium">Cloze mode (C)</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Flashcard modal"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Counter (when not complete) */}
        {!isComplete && queue.length > 0 && (
          <div className="px-5 pt-3 pb-1 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
              Card {currentIndex + 1} of {queue.length}
            </span>
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              {progressPercent}%
            </span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isComplete ? (
            /* Session Completed Screen */
            <div className="py-8 text-center space-y-6 animate-fade-in max-w-md mx-auto">
              <div className="w-18 h-18 rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <Trophy className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Session completed! 🎉
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  You reviewed {stats.totalReviewed} vocabulary cards in this Spaced Repetition session.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">Again</span>
                  <span className="text-lg font-mono font-extrabold text-slate-800 dark:text-slate-100">{stats.again}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">Hard</span>
                  <span className="text-lg font-mono font-extrabold text-slate-800 dark:text-slate-100">{stats.hard}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">Good</span>
                  <span className="text-lg font-mono font-extrabold text-slate-800 dark:text-slate-100">{stats.good}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">Easy</span>
                  <span className="text-lg font-mono font-extrabold text-slate-800 dark:text-slate-100">{stats.easy}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                {missedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReviewMissedCards}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Review missed cards ({missedItems.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Back to Vocabulary</span>
                </button>
              </div>
            </div>
          ) : currentCard ? (
            /* Active Card View */
            <div className="space-y-5">
              {/* Interactive Flashcard */}
              <div
                onClick={handleFlip}
                className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-3xl p-6 sm:p-8 min-h-[260px] sm:min-h-[300px] flex flex-col justify-between cursor-pointer transition shadow-sm hover:shadow-md relative group"
              >
                {/* Card Top Pill: Video Title & Mastered Status Badge */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                    {currentCard.lessonTitle}
                  </span>
                  {currentCard.mastered && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Mastered</span>
                    </span>
                  )}
                </div>

                {/* Card Center: English Word and Pronunciation */}
                <div className="text-center my-auto py-4 space-y-3">
                  <div className="inline-flex items-center justify-center gap-3">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white capitalize tracking-tight font-serif">
                      {currentCard.word}
                    </h2>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        speakWord(currentCard.word)
                      }}
                      title="Pronounce word (R)"
                      aria-label="Pronounce word"
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition cursor-pointer active:scale-95"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Context sentence with optional Cloze Test */}
                  {currentCard.contextSentence && (
                    <div className="max-w-lg mx-auto bg-white/70 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Context from video:
                      </span>
                      <p className="italic">
                        &quot;
                        {isCloze && !isFlipped
                          ? createClozeSentence(currentCard.contextSentence, currentCard.word)
                          : currentCard.contextSentence}
                        &quot;
                      </p>
                    </div>
                  )}

                  {/* Flipped Back Side: Vietnamese Meaning & Translation */}
                  {isFlipped ? (
                    <div className="space-y-3 pt-2 animate-fade-in">
                      {currentCard.meaning && (
                        <div className="inline-block px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-base sm:text-lg font-bold shadow-2xs">
                          {currentCard.meaning}
                        </div>
                      )}

                      {currentCard.contextSentenceTranslation && (
                        <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 italic max-w-lg mx-auto">
                          🇻🇳 &quot;{currentCard.contextSentenceTranslation}&quot;
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                      <span>Click card or press </span>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono">
                        Space
                      </kbd>
                      <span> to flip</span>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Original video link & Jump */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {Math.floor(currentCard.timestamp / 60)}:
                    {Math.floor(currentCard.timestamp % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                  {onJumpToTimestamp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onJumpToTimestamp(currentCard.videoId, currentCard.timestamp)
                        onClose()
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Play video</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Rating Bar (SM-2 Buttons when flipped, or Flip prompt when front) */}
              {isFlipped ? (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-medium">
                    <span>Rate your recall:</span>
                    <span className="font-mono text-[11px]">Shortcuts: 1 - 2 - 3 - 4</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    {/* 1: Again */}
                    <button
                      type="button"
                      onClick={() => handleRating(1)}
                      className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 transition active:scale-95 cursor-pointer text-left flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm">1. Again</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[10px] font-mono">
                          1
                        </kbd>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 mt-1">
                        {getIntervalPreviewText(currentCard, 1)}
                      </span>
                    </button>

                    {/* 2: Hard */}
                    <button
                      type="button"
                      onClick={() => handleRating(2)}
                      className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/70 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 transition active:scale-95 cursor-pointer text-left flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm">2. Hard</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
                          2
                        </kbd>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 mt-1">
                        {getIntervalPreviewText(currentCard, 2)}
                      </span>
                    </button>

                    {/* 3: Good */}
                    <button
                      type="button"
                      onClick={() => handleRating(3)}
                      className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 transition active:scale-95 cursor-pointer text-left flex flex-col justify-between group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm">3. Good</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono">
                          3
                        </kbd>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                        {getIntervalPreviewText(currentCard, 3)}
                      </span>
                    </button>

                    {/* 4: Easy */}
                    <button
                      type="button"
                      onClick={() => handleRating(4)}
                      className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 transition active:scale-95 cursor-pointer text-left flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm">4. Easy</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
                          4
                        </kbd>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400 mt-1">
                        {getIntervalPreviewText(currentCard, 4)}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleFlip}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Flip Card</span>
                    <kbd className="px-2 py-0.5 bg-indigo-500/80 rounded text-xs font-mono">
                      Space
                    </kbd>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
