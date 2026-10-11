import React, { useState, useMemo } from 'react'
import {
  Bookmark,
  Search,
  Trash2,
  Clock,
  Sparkles,
  ExternalLink,
  BookMarked,
  Volume2,
  CheckCircle2,
  Plus,
  Play,
  Check,
  BookOpen,
} from 'lucide-react'
import type { VocabularyItem } from '../../types'
import {
  getSRSStats,
  isWordDue,
  getDueVocabulary,
  speakWord,
} from '../../lib/srs/sm2'
import { FlashcardReviewModal } from './FlashcardReviewModal'
import { AddVocabularyModal } from './AddVocabularyModal'

interface VocabularyViewProps {
  vocabularyList: VocabularyItem[]
  onRemoveVocabulary: (id: string) => void
  onUpdateVocabulary?: (item: VocabularyItem) => void
  onAddVocabulary?: (item: VocabularyItem) => void
  onJumpToTimestamp?: (videoId: string, timestamp: number) => void
  activeLessonTitle?: string
  activeVideoId?: string
}

type VocabFilterTab = 'all' | 'due' | 'mastered'

export const VocabularyView: React.FC<VocabularyViewProps> = ({
  vocabularyList,
  onRemoveVocabulary,
  onUpdateVocabulary,
  onAddVocabulary,
  onJumpToTimestamp,
  activeLessonTitle,
  activeVideoId,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<VocabFilterTab>('all')
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [flashcardCustomQueue, setFlashcardCustomQueue] = useState<VocabularyItem[] | null>(null)

  const srsStats = useMemo(() => getSRSStats(vocabularyList), [vocabularyList])
  const dueItems = useMemo(() => getDueVocabulary(vocabularyList), [vocabularyList])

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  // Filter words by tab and search query
  const filteredWords = useMemo(() => {
    return vocabularyList.filter((item) => {
      // 1. Tab filter
      if (activeFilter === 'due') {
        if (!isWordDue(item)) return false
      } else if (activeFilter === 'mastered') {
        if (!item.mastered) return false
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        item.word.toLowerCase().includes(q) ||
        (item.meaning && item.meaning.toLowerCase().includes(q)) ||
        item.contextSentence.toLowerCase().includes(q) ||
        (item.contextSentenceTranslation &&
          item.contextSentenceTranslation.toLowerCase().includes(q))
      )
    })
  }, [vocabularyList, activeFilter, searchQuery])

  // Determine which cards to review when launching Flashcard
  const startReviewSession = (items?: VocabularyItem[]) => {
    if (items && items.length > 0) {
      setFlashcardCustomQueue(items)
    } else if (dueItems.length > 0) {
      setFlashcardCustomQueue(dueItems)
    } else {
      setFlashcardCustomQueue(vocabularyList)
    }
    setIsFlashcardOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header & SRS Stats Summary Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Vocabulary &amp; Flashcards ({vocabularyList.length} words)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Vocabulary &amp; Spaced Repetition Review
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Save words with video context, native pronunciation, mastery status, and spaced repetition review via the SuperMemo SM-2 algorithm.
          </p>
        </div>

        {/* Action Buttons: Start Flashcard Review & Add Custom Word */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {vocabularyList.length > 0 && (
            <button
              type="button"
              onClick={() => startReviewSession()}
              className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              title={dueItems.length > 0 ? `Start reviewing ${dueItems.length} words due today` : 'Flashcard Review'}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Review Flashcards ({dueItems.length})</span>
            </button>
          )}

          {onAddVocabulary && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Word</span>
            </button>
          )}
        </div>
      </div>

      {/* SRS Quick Stats Grid: 3 columns (Total, Due, Mastered) */}
      {vocabularyList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Stat 1: Total */}
          <div
            onClick={() => setActiveFilter('all')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Words
              </span>
              <BookOpen className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
              {srsStats.total}
            </span>
          </div>

          {/* Stat 2: Due Today */}
          <div
            onClick={() => setActiveFilter('due')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'due'
                ? 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Due Today
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {srsStats.due}
              </span>
              {srsStats.due > 0 && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded-full">
                  Due
                </span>
              )}
            </div>
          </div>

          {/* Stat 3: Mastered */}
          <div
            onClick={() => setActiveFilter('mastered')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'mastered'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Mastered
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {srsStats.mastered}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      {vocabularyList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({srsStats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('due')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeFilter === 'due'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Due</span>
              {srsStats.due > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                  {srsStats.due}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('mastered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'mastered'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Mastered ({srsStats.mastered})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by word, meaning, or sentence..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </div>
      )}

      {/* Words List or Empty State */}
      {vocabularyList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BookMarked className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No vocabulary in your notebook yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              While practicing in <strong className="text-indigo-600 dark:text-indigo-400">Practice</strong>,
              after checking your answer, simply click any word to save it with its translation and context sentence from the video.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            {onAddVocabulary && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Word</span>
              </button>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/80 dark:bg-indigo-950/60 px-3.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tip: Saving words with video context improves retention by 3x</span>
          </div>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
          No vocabulary found in this section{searchQuery ? ` matching "${searchQuery}"` : ''}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((item) => {
            const due = isWordDue(item)
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition flex flex-col justify-between space-y-3 relative group"
              >
                <div className="space-y-2.5">
                  {/* Top Word header with pronunciation, mastered toggle, and delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-indigo-950 dark:text-indigo-300 capitalize font-serif tracking-tight">
                        {item.word}
                      </h4>
                      <button
                        type="button"
                        onClick={() => speakWord(item.word)}
                        title="Pronounce word"
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onRemoveVocabulary(item.id)}
                        title="Delete word"
                        className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* SRS Badges & Meaning tag */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Meaning tag */}
                    {item.meaning && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                        <span>Meaning:</span>
                        <strong className="font-bold">{item.meaning}</strong>
                      </div>
                    )}

                    {/* Mastered Badge */}
                    {item.mastered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-lg text-[10px] font-bold">
                        <Check className="w-2.5 h-2.5" /> Mastered
                      </span>
                    ) : due ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-bold border border-amber-300/60 dark:border-amber-800">
                        <Clock className="w-2.5 h-2.5" /> Due today
                      </span>
                    ) : item.interval ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-semibold">
                        Review in {item.interval} day(s)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-semibold">
                        New word
                      </span>
                    )}
                  </div>

                  {/* Context sentence from video and translation */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                    <div>
                      <span className="font-bold text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wide mb-0.5">
                        Context from video:
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        &quot;{item.contextSentence}&quot;
                      </p>
                    </div>
                    {item.contextSentenceTranslation && (
                      <div className="border-t border-slate-200/70 dark:border-slate-700 pt-1.5">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[10px] uppercase tracking-wide mb-0.5">
                          Sentence meaning:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 italic">
                          &quot;{item.contextSentenceTranslation}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    {formatTime(item.timestamp)}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Review single card button */}
                    <button
                      type="button"
                      onClick={() => startReviewSession([item])}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      title="Review card in Flashcard"
                    >
                      Flip Card
                    </button>

                    {onJumpToTimestamp && (
                      <button
                        type="button"
                        onClick={() => onJumpToTimestamp(item.videoId, item.timestamp)}
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        <span>Replay</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Flashcard Review Modal */}
      {isFlashcardOpen && (
        <FlashcardReviewModal
          isOpen={isFlashcardOpen}
          onClose={() => {
            setIsFlashcardOpen(false)
            setFlashcardCustomQueue(null)
          }}
          itemsToReview={flashcardCustomQueue || (dueItems.length > 0 ? dueItems : vocabularyList)}
          onUpdateVocabulary={(updated) => {
            if (onUpdateVocabulary) {
              onUpdateVocabulary(updated)
            }
          }}
          onJumpToTimestamp={onJumpToTimestamp}
        />
      )}

      {/* Add Vocabulary Modal */}
      {isAddModalOpen && onAddVocabulary && (
        <AddVocabularyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddVocabulary={onAddVocabulary}
          activeLessonTitle={activeLessonTitle}
          activeVideoId={activeVideoId}
        />
      )}
    </div>
  )
}
