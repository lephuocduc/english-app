import React, { useState } from 'react'
import {
  Bookmark,
  Search,
  Trash2,
  Clock,
  Sparkles,
  ExternalLink,
  BookMarked,
  Volume2,
} from 'lucide-react'
import type { VocabularyItem } from '../../types'

interface VocabularyViewProps {
  vocabularyList: VocabularyItem[]
  onRemoveVocabulary: (id: string) => void
  onJumpToTimestamp?: (videoId: string, timestamp: number) => void
}

export const VocabularyView: React.FC<VocabularyViewProps> = ({
  vocabularyList,
  onRemoveVocabulary,
  onJumpToTimestamp,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  const handleSpeak = (word: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word)
      u.lang = 'en-US'
      window.speechSynthesis.speak(u)
    }
  }

  const filteredWords = vocabularyList.filter(
    (item) =>
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.meaning && item.meaning.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.contextSentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.contextSentenceTranslation &&
        item.contextSentenceTranslation.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Sổ tay từ vựng ({vocabularyList.length} từ)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Từ vựng đã lưu trong bài học
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Từ vựng kèm dịch nghĩa riêng và câu ví dụ từ video kèm bản dịch tiếng Việt thực tế.
          </p>
        </div>

        {/* Search Input */}
        {vocabularyList.length > 0 && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo từ, nghĩa hoặc ví dụ..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        )}
      </div>

      {/* Words List or Empty State */}
      {vocabularyList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BookMarked className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Chưa có từ vựng nào trong sổ tay
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Trong khi luyện nghe tại màn hình <strong className="text-indigo-600 dark:text-indigo-400">Luyện tập</strong>,
              sau khi kiểm tra đáp án, bạn chỉ cần bấm vào bất kỳ từ nào để lưu kèm nghĩa tiếng Việt và câu ví dụ từ video.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/80 dark:bg-indigo-950/60 px-3.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mẹo: Lưu từ vựng kèm ngữ cảnh video giúp ghi nhớ lâu hơn x3 lần</span>
          </div>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
          Không tìm thấy từ vựng phù hợp với từ khóa &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-indigo-950 dark:text-indigo-300 capitalize">
                      {item.word}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.word)}
                      title="Phát âm từ"
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveVocabulary(item.id)}
                    title="Xóa từ khỏi sổ từ"
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Meaning tag */}
                {item.meaning && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                    <span>Nghĩa:</span>
                    <strong className="font-bold">{item.meaning}</strong>
                  </div>
                )}

                {/* Context sentence from video and translation */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wide mb-0.5">
                      Ví dụ từ video:
                    </span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">&quot;{item.contextSentence}&quot;</p>
                  </div>
                  {item.contextSentenceTranslation && (
                    <div className="border-t border-slate-200/70 dark:border-slate-700 pt-1.5">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[10px] uppercase tracking-wide mb-0.5">
                        Dịch nghĩa câu:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 italic">&quot;{item.contextSentenceTranslation}&quot;</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  {formatTime(item.timestamp)}
                </span>

                {onJumpToTimestamp && (
                  <button
                    type="button"
                    onClick={() => onJumpToTimestamp(item.videoId, item.timestamp)}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <span>Nghe lại đoạn này</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
