import React, { useState, useEffect } from 'react'
import { X, Plus, Sparkles, Loader2, BookmarkPlus } from 'lucide-react'
import type { VocabularyItem } from '../../types'
import { translateToVietnamese } from '../../lib/translation/translator'

interface AddVocabularyModalProps {
  isOpen: boolean
  onClose: () => void
  onAddVocabulary: (item: VocabularyItem) => void
  activeLessonTitle?: string
  activeVideoId?: string
}

export const AddVocabularyModal: React.FC<AddVocabularyModalProps> = ({
  isOpen,
  onClose,
  onAddVocabulary,
  activeLessonTitle = 'Custom Vocabulary',
  activeVideoId = '',
}) => {
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [contextSentence, setContextSentence] = useState('')
  const [contextSentenceTranslation, setContextSentenceTranslation] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setWord('')
      setMeaning('')
      setContextSentence('')
      setContextSentenceTranslation('')
      setIsTranslating(false)
    }
  }, [isOpen])

  // Auto-translate word when user finishes typing word
  const handleAutoTranslate = async () => {
    if (!word.trim()) return
    setIsTranslating(true)
    try {
      const transWord = await translateToVietnamese(word.trim())
      if (transWord) setMeaning(transWord)

      if (contextSentence.trim() && !contextSentenceTranslation.trim()) {
        const transSentence = await translateToVietnamese(contextSentence.trim())
        if (transSentence) setContextSentenceTranslation(transSentence)
      }
    } catch {
      // ignore
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim()) return

    const newItem: VocabularyItem = {
      id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      word: word.trim(),
      meaning: meaning.trim() || undefined,
      contextSentence: contextSentence.trim() || `Example with ${word.trim()}`,
      contextSentenceTranslation: contextSentenceTranslation.trim() || undefined,
      timestamp: 0,
      videoId: activeVideoId,
      lessonTitle: activeLessonTitle,
      savedAt: new Date().toISOString(),
      mastered: false,
      interval: 0,
      repetitions: 0,
    }

    onAddVocabulary(newItem)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-vocab-modal-title"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="add-vocab-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Add New Vocabulary Word
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Save words with meaning and example sentence for Flashcard review
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              English Word: <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onBlur={handleAutoTranslate}
                placeholder="e.g. determine, breakthrough, persistent..."
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={isTranslating || !word.trim()}
                title="Auto-translate word"
                className="px-3 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {isTranslating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Translate</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vietnamese Meaning:
            </label>
            <input
              type="text"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="e.g. xác định, đột phá, kiên trì..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Example English Sentence:
            </label>
            <textarea
              rows={2}
              value={contextSentence}
              onChange={(e) => setContextSentence(e.target.value)}
              placeholder="e.g. She made a major breakthrough in scientific research."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sentence Vietnamese Translation:
            </label>
            <input
              type="text"
              value={contextSentenceTranslation}
              onChange={(e) => setContextSentenceTranslation(e.target.value)}
              placeholder="e.g. Cô ấy đã tạo ra một bước đột phá lớn trong nghiên cứu khoa học."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!word.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Vocabulary</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
