import React, { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Headphones,
  Trash2,
  ExternalLink,
  Plus,
} from 'lucide-react'
import type { Lesson, UserLessonProgress } from '../../types'
import { YouTubeImportForm } from '../youtube/YouTubeImportForm'

interface LessonsViewProps {
  lessons: Lesson[]
  activeLessonId: string
  onSelectLesson: (lessonId: string) => void
  onImportCustomVideo: (videoId: string, customTitle?: string) => void
  onDeleteVideo?: (videoId: string) => void
  allProgressMap: Record<string, UserLessonProgress>
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  onImportCustomVideo,
  onDeleteVideo,
  allProgressMap,
}) => {
  const [videoToDelete, setVideoToDelete] = useState<Lesson | null>(null)
  return (
    <div className="space-y-8">
      {/* Intro banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>YouTube Video Library</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            YouTube Dictation &amp; Listening Videos
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Paste any YouTube link to study, add sentence timestamps, and train listening reflexes with instant transcription scoring.
          </p>
        </div>
      </div>

      {/* YouTube URL Importer Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
          <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Add New YouTube Video</span>
        </div>
        <YouTubeImportForm onImportVideo={onImportCustomVideo} />
      </div>

      {/* Saved YouTube Videos Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Saved Videos ({lessons.length})</span>
          </h3>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Headphones className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No YouTube videos in your library yet
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Paste a YouTube link above to add your first video and start practicing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lessons.map((lesson) => {
              const isActive = lesson.id === activeLessonId
              const progress = allProgressMap[lesson.id]
              const total = lesson.sentences.length
              const completed = lesson.sentences.filter(
                (s) => (progress?.sentenceProgress[s.id]?.score ?? 0) >= 80
              ).length
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0

              return (
                <div
                  key={lesson.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  {/* YouTube Thumbnail Preview */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden group">
                    <img
                      src={`https://img.youtube.com/vi/${lesson.videoId}/mqdefault.jpg`}
                      alt={lesson.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        // Fallback if thumbnail unavailable
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono">
                      <span className="px-1.5 py-0.5 bg-black/60 rounded backdrop-blur-xs">
                        ID: {lesson.videoId}
                      </span>
                      <a
                        href={`https://www.youtube.com/watch?v=${lesson.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open video on YouTube"
                        className="p-1 hover:text-indigo-300 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {total > 0 ? `${total} sentence segments` : 'No segments yet'}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar if sentences exist */}
                    {total > 0 && (
                      <div className="pt-2">
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
                          <span>Completion progress</span>
                          <span className="font-semibold text-slate-700">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {onDeleteVideo && (
                        <button
                          type="button"
                          onClick={() => setVideoToDelete(lesson)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                          title="Delete video from library"
                          aria-label="Delete video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        {percent === 100 && total > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectLesson(lesson.id)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{isActive ? 'Practicing' : 'Practice'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Video Confirmation Modal */}
      {videoToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-video-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="delete-video-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  Xóa video khỏi thư viện?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  <strong className="text-slate-900 dark:text-white">&ldquo;{videoToDelete.title}&rdquo;</strong>
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  ID: {videoToDelete.videoId}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              ⚠️ Toàn bộ phân đoạn câu và tiến trình luyện tập của video này sẽ bị xóa khỏi máy và Cloudflare D1.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteVideo) {
                    onDeleteVideo(videoToDelete.id)
                  }
                  setVideoToDelete(null)
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa video này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
