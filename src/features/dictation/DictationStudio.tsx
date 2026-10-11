import React, { useState, useEffect, useRef } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Repeat,
  Sparkles,
  BookmarkPlus,
  Volume2,
  Info,
  Award,
  ArrowRight,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  Loader2,
  Clipboard,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import type {
  Lesson,
  SentenceSegment,
  ScoreResult,
  UserSentenceProgress,
} from '../../types'
import { scoreDictation } from '../../lib/scoring/scorer'
import { parseUniversalTranscript } from '../../lib/transcript/transcriptParser'
import { TranscriptImportModal } from '../transcript/TranscriptImportModal'
import { apiClient } from '../../lib/api/client'
import { translateToVietnamese, cleanWord } from '../../lib/translation/translator'

interface DictationStudioProps {
  lesson: Lesson
  activeSegmentIndex: number
  isPlayerReady: boolean
  isLooping?: boolean
  onToggleLoop?: () => void
  onSelectSegment: (index: number) => void
  onReplaySegment: () => void
  onSaveProgress: (progress: UserSentenceProgress) => void
  savedProgressMap: Record<string, UserSentenceProgress>
  onBookmarkVocabulary?: (
    word: string,
    contextSentence: string,
    timestamp: number,
    meaning?: string,
    contextSentenceTranslation?: string
  ) => void
  onAddSegment?: (segment: { startTime: number; endTime: number; text: string; translation?: string }) => void
  onImportTranscript?: (segments: SentenceSegment[], sourceName?: string) => void
  onDeleteSegment?: (segmentId: string) => void
  onAutoFetchTranscript?: () => Promise<void>
  onUpdateSegmentTranslation?: (segmentId: string, translation: string) => void
  isFetchingTranscript?: boolean
  getCurrentPlayerTime?: () => number
}

export const DictationStudio: React.FC<DictationStudioProps> = ({
  lesson,
  activeSegmentIndex,
  isPlayerReady,
  isLooping = false,
  onToggleLoop,
  onSelectSegment,
  onReplaySegment,
  onSaveProgress,
  savedProgressMap,
  onBookmarkVocabulary,
  onAddSegment,
  onImportTranscript,
  onDeleteSegment,
  onAutoFetchTranscript,
  onUpdateSegmentTranslation,
  isFetchingTranscript = false,
  getCurrentPlayerTime,
}) => {
  const currentSegment: SentenceSegment | undefined = lesson?.sentences?.[activeSegmentIndex]
  const saved = currentSegment ? savedProgressMap[currentSegment.id] : undefined

  const [userInput, setUserInput] = useState<string>(() => saved?.userInput || '')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(() => {
    if (saved?.userInput?.trim() && currentSegment) {
      return scoreDictation(currentSegment.text, saved.userInput)
    }
    return null
  })
  const [isRevealed, setIsRevealed] = useState<boolean>(() => saved?.isRevealed || false)
  const [selectedWordToBookmark, setSelectedWordToBookmark] = useState<string | null>(null)
  const [bookmarkSuccess, setBookmarkSuccess] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Translation states for active sentence and vocabulary
  const [segmentTranslation, setSegmentTranslation] = useState<string>(
    () => currentSegment?.translation || ''
  )
  const [isTranslatingSegment, setIsTranslatingSegment] = useState(false)
  const [wordTranslation, setWordTranslation] = useState<string>('')
  const [contextTranslation, setContextTranslation] = useState<string>('')
  const [isTranslatingVocab, setIsTranslatingVocab] = useState(false)

  // Sync segment translation when active sentence changes
  useEffect(() => {
    setSegmentTranslation(currentSegment?.translation || '')
    setIsTranslatingSegment(false)
  }, [currentSegment?.id, currentSegment?.translation])

  // Automatically fetch translation for selected word and its sentence from video
  useEffect(() => {
    if (!selectedWordToBookmark || !currentSegment) {
      setWordTranslation('')
      setContextTranslation('')
      return
    }

    const cleaned = cleanWord(selectedWordToBookmark)
    if (!cleaned) return

    let isCurrent = true
    setIsTranslatingVocab(true)

    const knownSentenceTrans = currentSegment.translation || segmentTranslation
    const sentencePromise = knownSentenceTrans
      ? Promise.resolve(knownSentenceTrans)
      : translateToVietnamese(currentSegment.text)

    Promise.all([translateToVietnamese(cleaned), sentencePromise])
      .then(([wTrans, sTrans]) => {
        if (!isCurrent) return
        setWordTranslation(wTrans || '')
        setContextTranslation(sTrans || '')
        if (sTrans && !segmentTranslation) {
          setSegmentTranslation(sTrans)
          if (onUpdateSegmentTranslation) {
            onUpdateSegmentTranslation(currentSegment.id, sTrans)
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setIsTranslatingVocab(false)
      })

    return () => {
      isCurrent = false
    }
  }, [selectedWordToBookmark, currentSegment, segmentTranslation, onUpdateSegmentTranslation])

  // When switching to another sentence, reset the typing input to blank and focus
  useEffect(() => {
    setUserInput('')
    setScoreResult(null)
    setIsRevealed(false)
    setSelectedWordToBookmark(null)
    setBookmarkSuccess(false)

    const timer = setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true })
    }, 80)
    return () => clearTimeout(timer)
  }, [activeSegmentIndex, lesson.id])

  // Handle checking the learner's answer
  const handleCheckAnswer = () => {
    if (!currentSegment) return

    const result = scoreDictation(currentSegment.text, userInput)
    setScoreResult(result)

    if (result.score === 100) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        })
      } catch {
        // ignore if canvas unavailable
      }
    }

    const previousAttempts = savedProgressMap[currentSegment.id]?.attempts || 0
    const progress: UserSentenceProgress = {
      sentenceId: currentSegment.id,
      userInput,
      score: result.score,
      isRevealed,
      attempts: previousAttempts + 1,
      completed: result.score >= 80,
      lastAttemptAt: new Date().toISOString(),
    }
    onSaveProgress(progress)

    // Persist attempt and metrics to Cloudflare D1
    if (typeof window !== 'undefined' && typeof fetch === 'function' && lesson?.id) {
      apiClient
        .recordAttempt({
          lessonId: lesson.id,
          segmentId: currentSegment.id,
          userInput,
          score: result.score,
          accuracy: result.accuracy,
          correctCount: result.correctCount,
          missingCount: result.missingCount,
          incorrectCount: result.incorrectCount,
          extraCount: result.extraCount,
        })
        .catch(() => {})
    }
  }

  // Handle retry: clears answer, resets score, replays audio, and focuses input
  const handleRetry = () => {
    setUserInput('')
    setScoreResult(null)
    setIsRevealed(false)
    onReplaySegment()
    setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true })
    }, 60)
  }

  // Toggle revealing expected answer - automatically translates to Vietnamese if needed
  const handleToggleReveal = async () => {
    const nextRevealed = !isRevealed
    setIsRevealed(nextRevealed)

    if (currentSegment) {
      const prev = savedProgressMap[currentSegment.id]
      if (prev) {
        onSaveProgress({ ...prev, isRevealed: nextRevealed })
      }

      // Automatically translate sentence if revealing answer and no translation exists yet
      if (nextRevealed && !segmentTranslation && !currentSegment.translation) {
        setIsTranslatingSegment(true)
        try {
          const trans = await translateToVietnamese(currentSegment.text)
          if (trans) {
            setSegmentTranslation(trans)
            if (onUpdateSegmentTranslation) {
              onUpdateSegmentTranslation(currentSegment.id, trans)
            }
          }
        } catch (err) {
          console.warn('Auto translation error:', err)
        } finally {
          setIsTranslatingSegment(false)
        }
      }
    }
  }

  const handleManualTranslateSentence = async () => {
    if (!currentSegment) return
    setIsTranslatingSegment(true)
    try {
      const trans = await translateToVietnamese(currentSegment.text)
      if (trans) {
        setSegmentTranslation(trans)
        if (onUpdateSegmentTranslation) {
          onUpdateSegmentTranslation(currentSegment.id, trans)
        }
      }
    } catch (err) {
      console.warn('Manual translation error:', err)
    } finally {
      setIsTranslatingSegment(false)
    }
  }

  // Navigation handlers
  const handlePrev = () => {
    if (activeSegmentIndex > 0) {
      onSelectSegment(activeSegmentIndex - 1)
    }
  }

  const handleNext = () => {
    if (activeSegmentIndex < lesson.sentences.length - 1) {
      onSelectSegment(activeSegmentIndex + 1)
    }
  }

  // Keyboard shortcut listener within typing area
  // Note: Global shortcuts (Alt+ArrowLeft, Alt+ArrowRight, Alt+L, Alt+R, Ctrl+Space)
  // bubble naturally to window in App.tsx to prevent duplicate double-step triggers.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift -> Submit answer
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCheckAnswer()
    }
  }

  const handleSaveWord = (word: string) => {
    if (!currentSegment || !onBookmarkVocabulary) return
    const cleaned = cleanWord(word)
    onBookmarkVocabulary(
      cleaned,
      currentSegment.text,
      currentSegment.startTime,
      wordTranslation.trim() || undefined,
      contextTranslation.trim() || undefined
    )
    setBookmarkSuccess(true)
    setTimeout(() => setBookmarkSuccess(false), 2500)
  }

  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false)
  const [showTranscriptImportModal, setShowTranscriptImportModal] = useState(false)
  const [newStartTime, setNewStartTime] = useState<string>('0')
  const [newEndTime, setNewEndTime] = useState<string>('5')
  const [newText, setNewText] = useState<string>('')
  const [newTranslation, setNewTranslation] = useState<string>('')

  const handleCaptureStartTime = () => {
    if (getCurrentPlayerTime) {
      const time = Math.floor(getCurrentPlayerTime())
      setNewStartTime(String(time))
      if (parseFloat(newEndTime) <= time) {
        setNewEndTime(String(time + 5))
      }
    }
  }

  const handleCaptureEndTime = () => {
    if (getCurrentPlayerTime) {
      const time = Math.ceil(getCurrentPlayerTime())
      setNewEndTime(String(time))
    }
  }

  const handleCreateSegment = (e: React.FormEvent) => {
    e.preventDefault()
    const start = parseFloat(newStartTime)
    const end = parseFloat(newEndTime)
    if (isNaN(start) || isNaN(end) || end <= start) {
      alert('End time must be greater than start time.')
      return
    }
    if (!newText.trim()) {
      alert('Please enter the English sentence for the segment.')
      return
    }

    if (onAddSegment) {
      onAddSegment({
        startTime: start,
        endTime: end,
        text: newText.trim(),
        translation: newTranslation.trim() || undefined,
      })
      setNewText('')
      setNewTranslation('')
      setShowAddSegmentModal(false)
    }
  }

  // If lesson has no sentences (custom YouTube video without pre-cut segments)
  if (!currentSegment || lesson.sentences.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                YouTube Sentence Dictation
              </h3>
              <p className="text-xs text-slate-500">
                Video is ready. Import subtitles or transcript to begin sentence-by-sentence dictation and instant feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Action cards: Auto-fetch vs Manual Paste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Auto-fetch from YouTube */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border border-indigo-100 flex flex-col justify-between space-y-4 hover:shadow-md transition">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-indigo-950">
                1. Auto-fetch subtitles from YouTube
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically extract official or auto-generated (ASR) subtitles with timestamped sentences.
              </p>
            </div>
            <button
              type="button"
              disabled={isFetchingTranscript}
              onClick={() => {
                if (onAutoFetchTranscript) {
                  onAutoFetchTranscript()
                } else {
                  setShowTranscriptImportModal(true)
                }
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isFetchingTranscript ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching YouTube subtitles...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-fetch Subtitles Now</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: Paste transcript / SRT file */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 border border-sky-100 flex flex-col justify-between space-y-4 hover:shadow-md transition">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-sky-950">
                2. Paste transcript or SRT / VTT file
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy transcript from YouTube (&quot;Show transcript&quot;) or upload your own .srt, .vtt subtitle file.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    if (text && onImportTranscript) {
                      const res = parseUniversalTranscript(text)
                      if (res.success && res.segments.length > 0) {
                        onImportTranscript(res.segments, 'Quick Paste from Clipboard')
                        return
                      }
                    }
                  } catch {
                    // ignore
                  }
                  setShowTranscriptImportModal(true)
                }}
                className="flex-1 py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Automatically read clipboard and import transcript"
              >
                <Clipboard className="w-4 h-4" />
                <span>Paste from Clipboard (1-click)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTranscriptImportModal(true)}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Upload / Paste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Manual Segment Addition Option */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Or manually add sentence segments with custom timestamps:
          </div>
          {onAddSegment && (
            <button
              type="button"
              onClick={() => {
                if (getCurrentPlayerTime) {
                  const t = Math.floor(getCurrentPlayerTime())
                  setNewStartTime(String(t))
                  setNewEndTime(String(t + 5))
                }
                setShowAddSegmentModal((prev) => !prev)
              }}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Add Custom Segment
            </button>
          )}
        </div>

        {/* Add segment inline form */}
        {showAddSegmentModal && onAddSegment && (
          <form onSubmit={handleCreateSegment} className="p-4 sm:p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Sentence Segment to Video
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSegmentModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Start time (seconds):</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                  {getCurrentPlayerTime && (
                    <button
                      type="button"
                      onClick={handleCaptureStartTime}
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-indigo-700 shadow-2xs transition"
                      title="Capture current video timestamp"
                    >
                      ⏱ Video Time
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">End time (seconds):</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                  {getCurrentPlayerTime && (
                    <button
                      type="button"
                      onClick={handleCaptureEndTime}
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-indigo-700 shadow-2xs transition"
                      title="Capture current video timestamp"
                    >
                      ⏱ Video Time
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Expected English text:</label>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Today I want to tell you three stories from my life."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vietnamese translation (optional):</label>
              <input
                type="text"
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                placeholder="e.g. Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddSegmentModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Save Segment
              </button>
            </div>
          </form>
        )}

        {/* Freeform dictation scratchpad */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label htmlFor="freeform-dictation-notes" className="block text-xs font-semibold text-slate-700">
            Freeform Dictation Notes:
          </label>
          <textarea
            id="freeform-dictation-notes"
            rows={4}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type what you hear as you watch the YouTube video..."
            className="w-full p-3.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition outline-none text-slate-900 leading-relaxed placeholder-slate-400"
          />
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>{userInput.trim() ? `${userInput.trim().split(/\s+/).length} words` : '0 words'}</span>
            <button
              type="button"
              onClick={() => setUserInput('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Clear notes
            </button>
          </div>
        </div>

        {/* Transcript Import Modal */}
        {showTranscriptImportModal && (
          <TranscriptImportModal
            isOpen={showTranscriptImportModal}
            onClose={() => setShowTranscriptImportModal(false)}
            videoId={lesson.videoId}
            lessonTitle={lesson.title}
            onSaveTranscript={(segments, sourceName) => {
              if (onImportTranscript) {
                onImportTranscript(segments, sourceName)
              }
            }}
          />
        )}
      </div>
    )
  }

  const totalSentences = lesson.sentences.length
  const completedCount = lesson.sentences.filter(
    (s) => (savedProgressMap[s.id]?.score ?? 0) >= 80
  ).length
  const progressPercent = Math.round((completedCount / totalSentences) * 100)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
      {/* Studio Header: Sentence navigation & progress indicator */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-100 dark:border-indigo-800 shadow-2xs">
            {activeSegmentIndex + 1}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sentence {activeSegmentIndex + 1} of {totalSentences}
              </h3>
              {savedProgressMap[currentSegment.id]?.completed && (
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Completed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lesson progress: {completedCount}/{totalSentences} sentences ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Prev / Next & Management Buttons */}
        <div className="flex items-center gap-1.5">
          {onImportTranscript && (
            <button
              type="button"
              onClick={() => setShowTranscriptImportModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-lg border border-sky-200 dark:border-sky-800 transition cursor-pointer"
              title="Manage / Change subtitles"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Subtitles</span>
            </button>
          )}

          {onAddSegment && (
            <button
              type="button"
              onClick={() => {
                if (getCurrentPlayerTime) {
                  const t = Math.floor(getCurrentPlayerTime())
                  setNewStartTime(String(t))
                  setNewEndTime(String(t + 5))
                }
                setShowAddSegmentModal((prev) => !prev)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
              title="Add new sentence segment"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Segment</span>
            </button>
          )}

          {onDeleteSegment && currentSegment && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this segment?')) {
                  onDeleteSegment(currentSegment.id)
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              title="Delete this segment"
              aria-label="Delete this segment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePrev}
            disabled={activeSegmentIndex === 0}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:cursor-not-allowed shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            title="Previous sentence"
            aria-label="Previous sentence"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={activeSegmentIndex === totalSentences - 1}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:cursor-not-allowed shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            title="Next sentence"
            aria-label="Next sentence"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add segment inline form when opened in active sentence view */}
      {showAddSegmentModal && onAddSegment && (
        <form onSubmit={handleCreateSegment} className="p-4 sm:p-5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800 space-y-3.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add New Sentence Segment
            </h4>
            <button
              type="button"
              onClick={() => setShowAddSegmentModal(false)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Start time (seconds):</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                  required
                />
                {getCurrentPlayerTime && (
                  <button
                    type="button"
                    onClick={handleCaptureStartTime}
                    className="px-2.5 py-1.5 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-700 dark:text-indigo-300 shadow-2xs transition"
                    title="Capture current video timestamp"
                  >
                    ⏱ Video Time
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">End time (seconds):</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                  required
                />
                {getCurrentPlayerTime && (
                  <button
                    type="button"
                    onClick={handleCaptureEndTime}
                    className="px-2.5 py-1.5 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-700 dark:text-indigo-300 shadow-2xs transition"
                    title="Capture current video timestamp"
                  >
                    ⏱ Video Time
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected English text:</label>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="e.g. Today I want to tell you three stories from my life."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Vietnamese translation (optional):</label>
            <input
              type="text"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              placeholder="e.g. Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddSegmentModal(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              Save Segment
            </button>
          </div>
        </form>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
        <div
          className="bg-indigo-600 h-1.5 transition-all duration-300"
          style={{ width: `${((activeSegmentIndex + 1) / totalSentences) * 100}%` }}
        />
      </div>

      {/* Active Segment Typing Studio */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Audio Prompt & Listen trigger */}
        {(() => {
          const expectedWords = currentSegment ? currentSegment.text.trim().split(/\s+/).filter(Boolean) : []
          const expectedWordCount = expectedWords.length
          const userWords = userInput.trim().split(/\s+/).filter(Boolean)
          const userWordCount = userWords.length

          return (
            <>
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    This sentence has <strong className="text-slate-900 dark:text-white font-bold">{expectedWordCount} words</strong>. Press &quot;Replay&quot; and type each word accurately.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onToggleLoop && (
                    <button
                      type="button"
                      onClick={onToggleLoop}
                      title={isLooping ? 'Disable sentence loop (Alt + L)' : 'Enable sentence loop (Alt + L)'}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                        isLooping
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                      <span>Loop{isLooping ? ': On' : ''}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onReplaySegment}
                    disabled={!isPlayerReady}
                    title="Replay sentence (Ctrl + Space or Alt + R)"
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  >
                    Replay
                  </button>
                </div>
              </div>

              {/* Textarea Input Area */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="dictation-input"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Your answer:
                    </label>
                    {expectedWordCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs">
                        💡 Hint: {expectedWordCount} words
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {expectedWordCount > 0 && (
                      <span
                        className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                          userWordCount === expectedWordCount
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : userWordCount > expectedWordCount
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Typed: {userWordCount} / {expectedWordCount} words
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      Shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300">Enter</kbd> submit • <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300">Ctrl+Space</kbd> replay
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    id="dictation-input"
                    ref={textareaRef}
                    rows={3}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Type what you hear (${expectedWordCount} words)... (Press Enter to check answer)`}
                    className="w-full p-4 text-base sm:text-lg font-medium bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/20 transition outline-none text-slate-900 dark:text-white leading-relaxed disabled:bg-slate-100 dark:disabled:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 tracking-wide"
                  />
                  {userInput.trim() && (
                    <span className="absolute bottom-2.5 right-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {userWordCount} / {expectedWordCount} words
                    </span>
                  )}
                </div>
              </div>
            </>
          )
        })()}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Submit / Check Answer */}
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={!userInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <Check className="w-4 h-4" />
              <span>Check Answer</span>
            </button>

            {/* Retry button */}
            <button
              type="button"
              onClick={handleRetry}
              disabled={!userInput && !scoreResult}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Show / Hide Expected Answer */}
            <button
              type="button"
              onClick={handleToggleReveal}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              {isRevealed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Hide Answer
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Show Answer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Revealed Expected Transcript Box */}
        {isRevealed && (
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Official Transcript:
              </span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                {lesson.transcriptSource}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed select-text">
              {currentSegment.text}
            </p>

            {/* Vietnamese Translation */}
            <div className="border-t border-indigo-100 dark:border-indigo-900/60 pt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide flex items-center gap-1">
                  🇻🇳 Vietnamese Translation:
                </span>
                {isTranslatingSegment && (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Translating to Vietnamese...
                  </span>
                )}
              </div>
              {segmentTranslation || currentSegment.translation ? (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-white/80 dark:bg-slate-900/90 p-2.5 rounded-lg border border-indigo-100/80 dark:border-slate-800 shadow-2xs">
                  {segmentTranslation || currentSegment.translation}
                </p>
              ) : isTranslatingSegment ? (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 italic">Loading translation...</p>
              ) : (
                <button
                  type="button"
                  onClick={handleManualTranslateSentence}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline font-semibold cursor-pointer"
                >
                  Translate this sentence to Vietnamese
                </button>
              )}
            </div>
          </div>
        )}

        {/* Word-Level Similarity Score & Detailed Results Summary */}
        {scoreResult && (
          <div className="mt-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4 transition-colors">
            {/* Top Score Banner & Tier */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
                    scoreResult.score >= 80
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : scoreResult.score >= 50
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {scoreResult.score}%
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Word Similarity
                    </span>
                    {scoreResult.score >= 80 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                        Passed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                    {scoreResult.feedbackText}
                  </p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg font-bold shadow-2xs">
                  Correct: {scoreResult.correctCount}
                </span>
                {scoreResult.missingCount > 0 && (
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg font-bold shadow-2xs">
                    Missing: {scoreResult.missingCount}
                  </span>
                )}
                {scoreResult.incorrectCount > 0 && (
                  <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg font-bold shadow-2xs">
                    Incorrect: {scoreResult.incorrectCount}
                  </span>
                )}
                {scoreResult.extraCount > 0 && (
                  <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg font-bold shadow-2xs">
                    Extra: {scoreResult.extraCount}
                  </span>
                )}
              </div>
            </div>

            {/* Word Alignment Visual Breakdown */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Detailed Word Alignment:
                </span>
                {/* Visual Legend */}
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Correct
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Incorrect
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Missing
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Extra
                  </span>
                </div>
              </div>

              <div
                role="region"
                aria-label="Word alignment comparison results"
                className="flex flex-wrap gap-2 items-center bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 min-h-14 shadow-2xs"
              >
                {scoreResult.alignments.map((item) => {
                  if (item.status === 'correct') {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedWordToBookmark(item.expectedWord || '')}
                        title="Correct word! Click to save to vocabulary"
                        aria-label={`Correct word: ${item.expectedWord}`}
                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        {item.expectedWord}
                      </button>
                    )
                  }
                  if (item.status === 'incorrect') {
                    return (
                      <span
                        key={item.id}
                        aria-label={`Incorrect word: ${item.userWord}, expected: ${item.expectedWord}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-lg text-xs shadow-2xs"
                      >
                        <span className="line-through text-rose-600 dark:text-rose-400 font-medium">
                          {item.userWord}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">→</span>
                        <button
                          type="button"
                          onClick={() => setSelectedWordToBookmark(item.expectedWord || '')}
                          title="Expected word. Click to save to vocabulary"
                          className="font-bold text-rose-900 dark:text-rose-200 underline hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                        >
                          {item.expectedWord}
                        </button>
                      </span>
                    )
                  }
                  if (item.status === 'missing') {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedWordToBookmark(item.expectedWord || '')}
                        title="Missing word. Click to save to vocabulary"
                        aria-label={`Missing word: ${item.expectedWord}`}
                        className="px-2.5 py-1 border border-dashed border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        [+ {item.expectedWord}]
                      </button>
                    )
                  }
                  if (item.status === 'extra') {
                    return (
                      <span
                        key={item.id}
                        title="Extra word"
                        aria-label={`Extra word: ${item.userWord}`}
                        className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 line-through rounded-lg text-xs font-medium shadow-2xs"
                      >
                        {item.userWord}
                      </span>
                    )
                  }
                  return null
                })}
              </div>

              {/* Word Bookmark helper banner with word translation, video example sentence, and translated sentence */}
              {selectedWordToBookmark && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-50 dark:from-indigo-950/60 via-white dark:via-slate-900 to-indigo-50/60 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs space-y-2.5 shadow-2xs animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-800/80 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookmarkPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        &quot;{cleanWord(selectedWordToBookmark)}&quot;
                      </span>
                      {isTranslatingVocab && !wordTranslation ? (
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" /> Translating word...
                        </span>
                      ) : wordTranslation ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs">
                          Meaning: {wordTranslation}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedWordToBookmark(null)}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveWord(selectedWordToBookmark)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Save to Vocabulary</span>
                      </button>
                    </div>
                  </div>

                  {/* Video context example sentence and its translation */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700 space-y-1 text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-indigo-900 dark:text-indigo-300 text-[10px] uppercase shrink-0 mt-0.5">
                        Context from video:
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white italic">
                        &quot;{currentSegment.text}&quot;
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 text-[10px] uppercase shrink-0 mt-0.5">
                        Sentence meaning:
                      </span>
                      {isTranslatingVocab && !contextTranslation ? (
                        <span className="text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Translating example sentence...
                        </span>
                      ) : (
                        <span className="font-normal italic">
                          &quot;{contextTranslation || segmentTranslation || currentSegment.translation || 'No translation available'}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {bookmarkSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Vocabulary!
                </p>
              )}
            </div>

            {/* Results Summary Action Workflow: Retry & Next Sentence */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs transition active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Retry Sentence</span>
                </button>

                <button
                  type="button"
                  onClick={onReplaySegment}
                  className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-medium rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  title="Replay audio segment to compare"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Replay to Compare</span>
                </button>
              </div>

              {activeSegmentIndex < totalSentences - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                    scoreResult.score >= 80
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <span>Next Sentence</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Non-pronunciation disclaimer */}
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
              <span>
                Word similarity score reflects typing accuracy; it does not measure or evaluate pronunciation.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Import Modal */}
      {showTranscriptImportModal && (
        <TranscriptImportModal
          isOpen={showTranscriptImportModal}
          onClose={() => setShowTranscriptImportModal(false)}
          videoId={lesson.videoId}
          lessonTitle={lesson.title}
          onSaveTranscript={(segments, sourceName) => {
            if (onImportTranscript) {
              onImportTranscript(segments, sourceName)
            }
          }}
        />
      )}
    </div>
  )
}
