import React, { useMemo, useState } from 'react'
import {
  Sparkles,
  Volume2,
  Square,
  Phone,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react'
import type { Lesson, VoiceAccent } from '../../types'
import {
  createAudioLessonFromText,
  estimateAudioDurationSeconds,
  splitTextIntoSentences,
} from '../../lib/audio/textToLesson'
import { sharedTtsAudioEngine } from '../../lib/audio/ttsAudioPlayer'

interface TextToAudioFormProps {
  onCreateAudioLesson: (lesson: Lesson) => void
}

export const TextToAudioForm: React.FC<TextToAudioFormProps> = ({
  onCreateAudioLesson,
}) => {
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate')
  const [voiceAccent, setVoiceAccent] = useState<VoiceAccent>('en-GB')
  const [previewPhoneMode, setPreviewPhoneMode] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stats = useMemo(() => {
    const sentences = splitTextIntoSentences(rawText)
    const words = rawText.trim().split(/\s+/).filter(Boolean).length
    const durationSec = estimateAudioDurationSeconds(rawText)
    return {
      sentenceCount: sentences.length,
      wordCount: words,
      durationSec,
      firstSentence: sentences[0] || '',
    }
  }, [rawText])

  const handleTogglePreview = async () => {
    if (isPreviewPlaying) {
      sharedTtsAudioEngine.stop()
      setIsPreviewPlaying(false)
      return
    }
    const sample = stats.firstSentence
    if (!sample) {
      setError('Vui lòng nhập nội dung tiếng Anh để nghe thử.')
      return
    }
    setError(null)
    await sharedTtsAudioEngine.playSegment({
      text: sample,
      accent: voiceAccent,
      isPhoneCallMode: previewPhoneMode,
      onStart: () => setIsPreviewPlaying(true),
      onEnd: () => setIsPreviewPlaying(false),
      onError: (msg) => {
        setIsPreviewPlaying(false)
        setError(msg)
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawText.trim() || stats.sentenceCount === 0) {
      setError('Vui lòng nhập hoặc dán đoạn văn bản tiếng Anh.')
      return
    }

    sharedTtsAudioEngine.stop()
    setIsPreviewPlaying(false)

    const generatedTitle =
      title.trim() || `Audio Lesson (${stats.wordCount} words • ~${stats.durationSec}s)`
    const lesson = createAudioLessonFromText({
      title: generatedTitle,
      rawText,
      level,
      voiceAccent,
    })

    setTitle('')
    setRawText('')
    setError(null)
    onCreateAudioLesson(lesson)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 transition-colors"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 space-y-1">
          <label
            htmlFor="tts-lesson-title"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Tiêu đề bài nghe (Lesson Title)
          </label>
          <input
            id="tts-lesson-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Production Database Failover Call (IT Ops)"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-slate-100 transition"
          />
        </div>

        <div className="md:col-span-3 space-y-1">
          <label
            htmlFor="tts-lesson-accent"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Giọng đọc (Accent)
          </label>
          <select
            id="tts-lesson-accent"
            value={voiceAccent}
            onChange={(e) => setVoiceAccent(e.target.value as VoiceAccent)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="en-GB">UK English (British — Mặc định)</option>
            <option value="en-US">US English (American)</option>
            <option value="en-AU">AU English (Australian)</option>
          </select>
        </div>

        <div className="md:col-span-3 space-y-1">
          <label
            htmlFor="tts-lesson-level"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Trình độ (Level)
          </label>
          <select
            id="tts-lesson-level"
            value={level}
            onChange={(e) =>
              setLevel(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')
            }
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="Beginner">A2-B1 (Beginner)</option>
            <option value="Intermediate">B1-B2 (Intermediate)</option>
            <option value="Advanced">C1 (Advanced)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="tts-raw-text"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Nội dung đoạn văn tiếng Anh (tự động tách câu &amp; chuyển thành Audio)</span>
          </label>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>{stats.sentenceCount} câu</span>
            <span>•</span>
            <span>{stats.wordCount} từ</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
              <Clock className="w-3 h-3" /> ~{stats.durationSec}s
            </span>
          </div>
        </div>

        <textarea
          id="tts-raw-text"
          rows={5}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Paste or type your English passage here (recommended ~120-160 words for a 1-minute listening exercise)..."
          className="w-full p-3.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-slate-100 leading-relaxed resize-y transition"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-3 py-2 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePreview}
            disabled={stats.sentenceCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            {isPreviewPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 text-rose-500 fill-current" />
                <span>Dừng nghe thử</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Nghe thử câu đầu</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPreviewPhoneMode((v) => !v)}
            aria-pressed={previewPhoneMode}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              previewPhoneMode
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-200'
            }`}
            title="Nghe thử hiệu ứng âm thanh qua đường dây điện thoại"
          >
            {previewPhoneMode ? (
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Phone className="w-3.5 h-3.5" />
            )}
            <span>Thử giọng điện thoại</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={stats.sentenceCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          <span>Tạo Audio &amp; Lưu Database</span>
          <CheckCircle2 className="w-4 h-4 opacity-80" />
        </button>
      </div>
    </form>
  )
}
