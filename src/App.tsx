import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles,
  Sliders,
  ExternalLink,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import type {
  Lesson,
  NavTab,
  SentenceSegment,
  StudyPreferences,
  UserLessonProgress,
  UserSentenceProgress,
  VocabularyItem,
} from './types'
import { DEFAULT_YOUTUBE_VIDEOS } from './data/defaultVideo'
import { storage } from './lib/storage/storage'
import { apiClient } from './lib/api/client'
import { parseYouTubeUrl } from './features/youtube/urlParser'
import { useYouTubePlayer } from './features/youtube/useYouTubePlayer'
import { YouTubePlayerView } from './features/youtube/YouTubePlayerView'
import { SentenceList } from './features/dictation/SentenceList'
import { DictationStudio } from './features/dictation/DictationStudio'
import { LessonsView } from './features/lessons/LessonsView'
import { VocabularyView } from './features/vocabulary/VocabularyView'
import { ProgressView } from './features/progress/ProgressView'
import { Navbar } from './components/Navbar'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { CloudSyncModal } from './components/CloudSyncModal'
import { TranscriptImportModal } from './features/transcript/TranscriptImportModal'
import { fetchYouTubeVideoMetadata } from './lib/youtube/videoMetadata'

export function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavTab>('practice')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false)

  // Quick YouTube URL input state
  const [quickUrlInput, setQuickUrlInput] = useState('')
  const [quickImportError, setQuickImportError] = useState<string | null>(null)

  // YouTube Videos list & Active video state
  const [videosList, setVideosList] = useState<Lesson[]>(() => {
    const saved = storage.loadVideos()
    return saved && saved.length > 0 ? saved : DEFAULT_YOUTUBE_VIDEOS
  })

  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    const savedId = storage.loadActiveLessonId()
    const initialList = storage.loadVideos() || DEFAULT_YOUTUBE_VIDEOS
    return savedId && initialList.some((l) => l.id === savedId)
      ? savedId
      : initialList[0]?.id || ''
  })

  // Selected sentence segment index
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0)
  const activeSegmentIndexRef = useRef<number>(0)
  useEffect(() => {
    activeSegmentIndexRef.current = activeSegmentIndex
  }, [activeSegmentIndex])

  // Local storage state
  const [preferences, setPreferences] = useState<StudyPreferences>(() =>
    storage.loadPreferences()
  )
  const [allLessonsProgress, setAllLessonsProgress] = useState<
    Record<string, UserLessonProgress>
  >(() => {
    const map: Record<string, UserLessonProgress> = {}
    const initialList = storage.loadVideos() || DEFAULT_YOUTUBE_VIDEOS
    initialList.forEach((l) => {
      const prog = storage.loadLessonProgress(l.id)
      if (prog) map[l.id] = prog
    })
    return map
  })
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>(() =>
    storage.loadVocabulary()
  )

  const activeLesson: Lesson | undefined =
    videosList.find((l) => l.id === activeLessonId) || videosList[0]

  const activeSegment: SentenceSegment | undefined =
    activeLesson?.sentences ? activeLesson.sentences[activeSegmentIndex] : undefined

  // Refresh all state from local storage after cloud sync
  const refreshAllData = useCallback(() => {
    const freshVideos = storage.loadVideos() || DEFAULT_YOUTUBE_VIDEOS
    setVideosList(freshVideos)
    setVocabularyList(storage.loadVocabulary())
    const map: Record<string, UserLessonProgress> = {}
    freshVideos.forEach((l) => {
      const prog = storage.loadLessonProgress(l.id)
      if (prog) map[l.id] = prog
    })
    setAllLessonsProgress(map)
  }, [])

  // Auto-sync with Cloudflare D1 on initial load
  useEffect(() => {
    storage
      .syncWithCloud()
      .then((res) => {
        if (res.lessonsCount > 0 || res.vocabCount > 0 || res.progressCount > 0) {
          refreshAllData()
        }
      })
      .catch(() => {})
  }, [refreshAllData])

  // Helper to update a lesson's title with the real YouTube title
  const updateVideoTitle = useCallback((videoId: string, newTitle: string) => {
    if (!newTitle || !newTitle.trim()) return
    const trimmed = newTitle.trim()
    setVideosList((prev) => {
      let changed = false
      let updatedLessonId = ''
      const updated = prev.map((v) => {
        if (
          v.videoId === videoId &&
          (v.title.startsWith('YouTube: ') ||
            v.title === 'YouTube Video' ||
            v.title === 'Đang tải tiêu đề YouTube...' ||
            v.title === `video-${videoId}`)
        ) {
          changed = true
          updatedLessonId = v.id
          return { ...v, title: trimmed }
        }
        return v
      })
      if (changed) {
        storage.saveVideos(updated)
        if (updatedLessonId) {
          apiClient.updateLesson(updatedLessonId, { title: trimmed }).catch(() => {})
        }
      }
      return changed ? updated : prev
    })
  }, [])

  // Setup YouTube IFrame Player hook
  const {
    isReady: isPlayerReady,
    isPlaying,
    playerError,
    playbackRate,
    isLooping,
    toggleLoop,
    reloadPlayer,
    playSegment,
    togglePlayPause,
    seekTo,
    changeSpeed,
    getCurrentTime,
  } = useYouTubePlayer({
    containerId: 'listenflow-youtube-player-frame',
    videoId: activeLesson ? activeLesson.videoId : '',
    initialSpeed: preferences.playbackSpeed,
    onVideoMetadata: (meta) => {
      if (meta?.title && activeLesson) {
        updateVideoTitle(activeLesson.videoId, meta.title)
      }
    },
  })

  // Automatically fetch official title if active video currently has a placeholder title
  useEffect(() => {
    if (
      activeLesson?.videoId &&
      (activeLesson.title.startsWith('YouTube: ') ||
        activeLesson.title === 'YouTube Video' ||
        activeLesson.title === 'Đang tải tiêu đề YouTube...')
    ) {
      fetchYouTubeVideoMetadata(activeLesson.videoId).then((meta) => {
        if (meta?.title) {
          updateVideoTitle(activeLesson.videoId, meta.title)
        }
      })
    }
  }, [activeLesson?.videoId, activeLesson?.title, updateVideoTitle])

  // Set active segment and auto-seek player to start time
  const handleSelectSegment = useCallback(
    (index: number) => {
      if (activeLesson && index >= 0 && index < activeLesson.sentences.length) {
        activeSegmentIndexRef.current = index
        setActiveSegmentIndex(index)
        const seg = activeLesson.sentences[index]
        if (seg && isPlayerReady) {
          playSegment(seg.startTime, seg.endTime)
        }
      }
    },
    [activeLesson, isPlayerReady, playSegment]
  )

  // Replay current segment
  const handleReplayCurrent = useCallback(() => {
    if (activeSegment && isPlayerReady) {
      playSegment(activeSegment.startTime, activeSegment.endTime)
    }
  }, [activeSegment, isPlayerReady, playSegment])

  // Select another video
  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId)
    storage.saveActiveLessonId(lessonId)
    setActiveSegmentIndex(0)
    setActiveTab('practice')
  }

  // Auto-fetch transcript state
  const [isAutoFetchingTranscript, setIsAutoFetchingTranscript] = useState(false)
  const [showQuickTranscriptModal, setShowQuickTranscriptModal] = useState(false)
  const [transcriptBannerMessage, setTranscriptBannerMessage] = useState<{
    type: 'loading' | 'success' | 'info' | 'error'
    message: string
    action?: {
      label: string
      onClick: () => void
    }
  } | null>(null)

  const handleAutoFetchTranscript = useCallback(
    async (targetLessonId?: string) => {
      const target = targetLessonId
        ? videosList.find((v) => v.id === targetLessonId)
        : activeLesson

      if (!target?.videoId) return

      setIsAutoFetchingTranscript(true)
      setTranscriptBannerMessage({
        type: 'loading',
        message: `Đang tự động tải phụ đề YouTube cho video (${target.videoId})...`,
      })

      try {
        const res = await apiClient.fetchYouTubeTranscript(target.videoId, 'en')
        if (res.success && res.sentences && res.sentences.length > 0) {
          const finalTitle =
            target.title.startsWith('YouTube: ') && res.title ? res.title : target.title
          const updated = videosList.map((v) => {
            if (v.id === target.id) {
              return {
                ...v,
                sentences: res.sentences!,
                title: finalTitle,
                transcriptSource: res.isAutoGenerated
                  ? 'YouTube (Phụ đề tự động)'
                  : 'YouTube (Phụ đề chính thức)',
                isVerified: true,
              }
            }
            return v
          })

          setVideosList(updated)
          storage.saveVideos(updated)

          // Persist full lesson and segments to Cloudflare D1 database in background
          apiClient
            .createLesson({
              id: target.id,
              videoId: target.videoId,
              title: finalTitle,
              description: target.description,
              language: target.language,
              level: target.level,
              sentences: res.sentences,
            })
            .catch(() => {})

          setTranscriptBannerMessage({
            type: 'success',
            message: `🎉 Đã tải thành công ${res.sentences.length} câu phụ đề từ YouTube! Sẵn sàng luyện chép chính tả.`,
          })

          setTimeout(() => {
            setTranscriptBannerMessage((cur) => (cur?.type === 'success' ? null : cur))
          }, 6000)
        } else {
          const isRateLimit =
            Boolean(res.error && (res.error.includes('429') || res.error.toLowerCase().includes('giới hạn')))
          setTranscriptBannerMessage({
            type: isRateLimit ? 'error' : 'info',
            message:
              res.error ||
              'Video này không có phụ đề tự động trên YouTube. Bạn có thể bấm "Dán transcript ngay" để bắt đầu.',
            action: {
              label: '📋 Dán transcript ngay (5s)',
              onClick: () => setShowQuickTranscriptModal(true),
            },
          })
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Lỗi kết nối khi tải phụ đề từ YouTube.'
        setTranscriptBannerMessage({
          type: 'error',
          message: errorMsg,
          action: {
            label: '📋 Dán transcript ngay (5s)',
            onClick: () => setShowQuickTranscriptModal(true),
          },
        })
      } finally {
        setIsAutoFetchingTranscript(false)
      }
    },
    [videosList, activeLesson]
  )

  const handleImportTranscript = useCallback(
    (segments: SentenceSegment[], sourceName?: string) => {
      if (!activeLesson) return

      const updated = videosList.map((v) => {
        if (v.id === activeLesson.id) {
          return {
            ...v,
            sentences: segments,
            transcriptSource: sourceName || 'Người học tự dán (User Custom)',
            isVerified: true,
          }
        }
        return v
      })

      setVideosList(updated)
      storage.saveVideos(updated)
      setActiveSegmentIndex(0)

      // Persist full lesson and segments to Cloudflare D1
      apiClient
        .createLesson({
          id: activeLesson.id,
          videoId: activeLesson.videoId,
          title: activeLesson.title,
          description: activeLesson.description,
          language: activeLesson.language,
          level: activeLesson.level,
          sentences: segments,
        })
        .catch(() => {})

      setTranscriptBannerMessage({
        type: 'success',
        message: `🎉 Đã lưu ${segments.length} câu phụ đề vào bài học!`,
      })

      setTimeout(() => {
        setTranscriptBannerMessage((cur) => (cur?.type === 'success' ? null : cur))
      }, 5000)
    },
    [activeLesson, videosList]
  )

  // Handle importing any YouTube video
  const handleImportVideo = (videoId: string, customTitle?: string) => {
    const videoItemId = `video-${videoId}`
    const existing = videosList.find(
      (v) => v.id === videoItemId || v.videoId === videoId
    )

    if (existing) {
      setActiveLessonId(existing.id)
      storage.saveActiveLessonId(existing.id)
      if (existing.sentences.length === 0) {
        setTimeout(() => {
          handleAutoFetchTranscript(existing.id)
        }, 100)
      }
      if (!customTitle && (existing.title.startsWith('YouTube: ') || existing.title === 'YouTube Video')) {
        fetchYouTubeVideoMetadata(videoId).then((meta) => {
          if (meta?.title) {
            updateVideoTitle(videoId, meta.title)
          }
        })
      }
    } else {
      const newVideo: Lesson = {
        id: videoItemId,
        title: customTitle || 'Đang tải tiêu đề YouTube...',
        videoId,
        language: 'English',
        transcriptSource: 'YouTube Video',
        isVerified: true,
        level: 'Intermediate',
        description:
          'Video luyện nghe từ YouTube. Bạn có thể tự do thêm phân đoạn câu để luyện chép chính tả.',
        sentences: [],
      }

      const updated = [newVideo, ...videosList]
      setVideosList(updated)
      storage.saveVideos(updated)
      setActiveLessonId(videoItemId)
      storage.saveActiveLessonId(videoItemId)

      // Persist new lesson directly to Cloudflare D1
      apiClient
        .createLesson({
          id: newVideo.id,
          videoId: newVideo.videoId,
          title: newVideo.title,
          description: newVideo.description,
          language: newVideo.language,
          level: newVideo.level,
          sentences: [],
        })
        .catch(() => {})

      // Fetch real YouTube title immediately via oEmbed / noembed
      if (!customTitle) {
        fetchYouTubeVideoMetadata(videoId).then((meta) => {
          if (meta?.title) {
            updateVideoTitle(videoId, meta.title)
          } else {
            updateVideoTitle(videoId, `YouTube: ${videoId}`)
          }
        })
      }

      // Automatically trigger transcript auto-fetch for the newly inserted video!
      setTimeout(() => {
        handleAutoFetchTranscript(videoItemId)
      }, 100)
    }

    setActiveSegmentIndex(0)
    setActiveTab('practice')
  }

  // Quick URL submit from Practice view
  const handleQuickImport = (e: React.FormEvent) => {
    e.preventDefault()
    setQuickImportError(null)

    const parsed = parseYouTubeUrl(quickUrlInput)
    if (!parsed.isValid || !parsed.videoId) {
      setQuickImportError(parsed.error || 'Vui lòng dán đường link YouTube hợp lệ.')
      return
    }

    handleImportVideo(parsed.videoId)
    setQuickUrlInput('')
  }

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setQuickUrlInput(text)
        setQuickImportError(null)
      }
    } catch {
      // ignore
    }
  }

  // Add new sentence segment to active video
  const handleAddSegment = (segmentData: {
    startTime: number
    endTime: number
    text: string
    translation?: string
  }) => {
    if (!activeLesson) return

    const newSegment: SentenceSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: segmentData.startTime,
      endTime: segmentData.endTime,
      text: segmentData.text,
      translation: segmentData.translation,
    }

    const updatedSentences = [...activeLesson.sentences, newSegment].sort(
      (a, b) => a.startTime - b.startTime
    )

    const updatedVideos = videosList.map((v) =>
      v.id === activeLesson.id ? { ...v, sentences: updatedSentences } : v
    )

    setVideosList(updatedVideos)
    storage.saveVideos(updatedVideos)

    const newIdx = updatedSentences.findIndex((s) => s.id === newSegment.id)
    if (newIdx >= 0) {
      setActiveSegmentIndex(newIdx)
    }
  }

  // Delete sentence segment from active video
  const handleDeleteSegment = (segmentId: string) => {
    if (!activeLesson) return

    const updatedSentences = activeLesson.sentences.filter(
      (s) => s.id !== segmentId
    )

    const updatedVideos = videosList.map((v) =>
      v.id === activeLesson.id ? { ...v, sentences: updatedSentences } : v
    )

    setVideosList(updatedVideos)
    storage.saveVideos(updatedVideos)
    setActiveSegmentIndex(0)
  }

  // Delete YouTube video from library
  const handleDeleteVideo = (videoIdOrId: string) => {
    const updated = storage.deleteVideo(videoIdOrId)
    setVideosList(updated)

    if (activeLessonId === videoIdOrId || activeLesson?.videoId === videoIdOrId) {
      if (updated.length > 0) {
        setActiveLessonId(updated[0].id)
        storage.saveActiveLessonId(updated[0].id)
      } else {
        setActiveLessonId('')
        storage.saveActiveLessonId('')
      }
      setActiveSegmentIndex(0)
    }
  }

  // Save sentence progress to local storage
  const handleSaveSentenceProgress = (progress: UserSentenceProgress) => {
    if (!activeLesson) return

    storage.saveSentenceProgress(activeLesson.id, progress, progress.sentenceId)

    setAllLessonsProgress((prev) => {
      const current = prev[activeLesson.id] || {
        lessonId: activeLesson.id,
        sentenceProgress: {},
        lastSentenceId: progress.sentenceId,
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        [activeLesson.id]: {
          ...current,
          sentenceProgress: {
            ...current.sentenceProgress,
            [progress.sentenceId]: progress,
          },
          lastSentenceId: progress.sentenceId,
          updatedAt: new Date().toISOString(),
        },
      }
    })
  }

  // Vocabulary bookmarking with specific word translation and video example sentence translation
  const handleBookmarkVocabulary = (
    word: string,
    contextSentence: string,
    timestamp: number,
    meaning?: string,
    contextSentenceTranslation?: string
  ) => {
    if (!activeLesson) return

    const newItem: VocabularyItem = {
      id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      word,
      meaning,
      contextSentence,
      contextSentenceTranslation,
      timestamp,
      videoId: activeLesson.videoId,
      lessonTitle: activeLesson.title,
      savedAt: new Date().toISOString(),
    }
    const updated = storage.addVocabulary(newItem)
    setVocabularyList(updated)

    // Persist to Cloudflare D1
    apiClient
      .saveVocabulary({
        id: newItem.id,
        word: newItem.word,
        meaning: newItem.meaning,
        contextSentence: newItem.contextSentence,
        timestamp: newItem.timestamp,
        videoId: newItem.videoId,
        lessonTitle: newItem.lessonTitle,
      })
      .catch(() => {})
  }

  // Update a segment's Vietnamese translation in lesson
  const handleUpdateSegmentTranslation = useCallback(
    (segmentId: string, translation: string) => {
      if (!activeLesson || !translation) return
      const updatedSentences = activeLesson.sentences.map((s) =>
        s.id === segmentId ? { ...s, translation } : s
      )
      const updatedVideos = videosList.map((v) =>
        v.id === activeLesson.id ? { ...v, sentences: updatedSentences } : v
      )
      setVideosList(updatedVideos)
      storage.saveVideos(updatedVideos)
    },
    [activeLesson, videosList]
  )

  const handleRemoveVocabulary = (id: string) => {
    const toDelete = vocabularyList.find((v) => v.id === id)
    const updated = storage.removeVocabulary(id)
    setVocabularyList(updated)
    apiClient.deleteVocabulary(id).catch(() => {})
    if (toDelete?.word) {
      apiClient.deleteVocabulary(toDelete.word).catch(() => {})
    }
  }

  const handleJumpToVocabTimestamp = (videoId: string, timestamp: number) => {
    const matchingVideo = videosList.find((l) => l.videoId === videoId)
    if (matchingVideo) {
      setActiveLessonId(matchingVideo.id)
      setActiveTab('practice')
      setTimeout(() => {
        seekTo(timestamp)
      }, 500)
    } else {
      handleImportVideo(videoId)
      setTimeout(() => {
        seekTo(timestamp)
      }, 500)
    }
  }

  // Reset progress
  const handleResetAllProgress = () => {
    storage.clearAllProgress()
    setAllLessonsProgress({})
    setVocabularyList([])
    setActiveSegmentIndex(0)
  }

  // Change speed handler
  const handleSpeedChange = (speed: number) => {
    changeSpeed(speed)
    const newPrefs = { ...preferences, playbackSpeed: speed }
    setPreferences(newPrefs)
    storage.savePreferences(newPrefs)
  }

  // Global key bindings:
  // - Space (when not typing in textarea/input): toggle play/pause
  // - Ctrl + Space or Alt + R: replay current segment
  // - Alt + L: toggle segment loop
  // - Alt + ArrowLeft / ArrowRight: prev / next segment
  // - ?: toggle keyboard shortcuts dialog
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable

      if (e.key === '?' && !isTyping) {
        e.preventDefault()
        setShowKeyboardShortcuts((prev) => !prev)
        return
      }

      if (activeTab !== 'practice') return

      // Space to toggle play/pause when not typing
      if (e.code === 'Space' && !isTyping) {
        e.preventDefault()
        togglePlayPause()
        return
      }

      // Replay current segment
      if (
        (e.ctrlKey && e.code === 'Space') ||
        (e.altKey && e.key.toLowerCase() === 'r')
      ) {
        e.preventDefault()
        if (e.repeat) return
        handleReplayCurrent()
        return
      }

      // Alt + L: toggle loop mode
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        if (e.repeat) return
        toggleLoop()
        return
      }

      // Navigate sentences (Alt + Left / Alt + Right)
      if (activeLesson && activeLesson.sentences.length > 0) {
        if (e.altKey && e.key === 'ArrowLeft') {
          e.preventDefault()
          if (e.repeat) return
          const curIdx = activeSegmentIndexRef.current
          if (curIdx > 0) {
            handleSelectSegment(curIdx - 1)
          }
        } else if (e.altKey && e.key === 'ArrowRight') {
          e.preventDefault()
          if (e.repeat) return
          const curIdx = activeSegmentIndexRef.current
          if (curIdx < activeLesson.sentences.length - 1) {
            handleSelectSegment(curIdx + 1)
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [
    activeTab,
    activeLesson,
    handleSelectSegment,
    handleReplayCurrent,
    togglePlayPause,
    toggleLoop,
  ])

  const activeLessonProgress = activeLesson
    ? allLessonsProgress[activeLesson.id]?.sentenceProgress || {}
    : {}

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
        vocabularyCount={vocabularyList.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* VIEW 1: PRACTICE STUDIO (Kept mounted via CSS to avoid destroying YouTube iframe on tab switch) */}
        <div className={activeTab === 'practice' ? 'space-y-6' : 'hidden'}>
          {/* Quick YouTube URL Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs">
            <form
              onSubmit={handleQuickImport}
              className="flex flex-col sm:flex-row items-stretch gap-2.5"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={quickUrlInput}
                  onChange={(e) => {
                    setQuickUrlInput(e.target.value)
                    if (quickImportError) setQuickImportError(null)
                  }}
                  placeholder="Dán link YouTube bất kỳ (https://www.youtube.com/watch?v=..., youtu.be, shorts)..."
                  className="w-full pl-3.5 pr-16 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 placeholder-slate-400 font-mono transition"
                />
                <button
                  type="button"
                  onClick={handleQuickPaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-2xs transition"
                >
                  Dán
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp video</span>
              </button>
            </form>

            {quickImportError && (
              <p className="mt-2 text-xs text-rose-600">{quickImportError}</p>
            )}
          </div>

          {/* Active Video Header or Empty State */}
          {activeLesson ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      YouTube ID: {activeLesson.videoId}
                    </span>
                    <a
                      href={`https://www.youtube.com/watch?v=${activeLesson.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem trên YouTube</span>
                    </a>
                  </div>
                  <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight">
                    {activeLesson.title}
                  </h1>
                </div>

                {/* Switch video button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('lessons')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Đổi video khác ({videosList.length})</span>
                </button>
              </div>

              {/* Transcript Auto-fetch / Import Status Banner */}
              {transcriptBannerMessage && (
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in ${
                    transcriptBannerMessage.type === 'loading'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : transcriptBannerMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                      : transcriptBannerMessage.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2.5 flex-1">
                    {transcriptBannerMessage.type === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
                    ) : transcriptBannerMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <span className="leading-relaxed">{transcriptBannerMessage.message}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {transcriptBannerMessage.action && (
                      <button
                        type="button"
                        onClick={transcriptBannerMessage.action.onClick}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {transcriptBannerMessage.action.label}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTranscriptBannerMessage(null)}
                      className="p-1 hover:opacity-70 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      aria-label="Đóng thông báo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Two-Column Studio Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (YouTube Player & Sentence Navigation) */}
                <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                  <YouTubePlayerView
                    containerId="listenflow-youtube-player-frame"
                    videoId={activeLesson.videoId}
                    isReady={isPlayerReady}
                    isPlaying={isPlaying}
                    isLooping={isLooping}
                    playerError={playerError}
                    currentSpeed={playbackRate}
                    activeSegment={activeSegment || null}
                    onPlaySegment={() => {
                      if (activeSegment) {
                        playSegment(activeSegment.startTime, activeSegment.endTime)
                      } else {
                        togglePlayPause()
                      }
                    }}
                    onTogglePlayPause={togglePlayPause}
                    onToggleLoop={toggleLoop}
                    onReloadPlayer={reloadPlayer}
                    onChangeSpeed={handleSpeedChange}
                    onPreviousSegment={
                      activeLesson.sentences.length > 0 && activeSegmentIndex > 0
                        ? () => handleSelectSegment(activeSegmentIndex - 1)
                        : undefined
                    }
                    onNextSegment={
                      activeLesson.sentences.length > 0 &&
                      activeSegmentIndex < activeLesson.sentences.length - 1
                        ? () => handleSelectSegment(activeSegmentIndex + 1)
                        : undefined
                    }
                    hasPreviousSegment={activeSegmentIndex > 0}
                    hasNextSegment={
                      activeLesson.sentences.length > 0 &&
                      activeSegmentIndex < activeLesson.sentences.length - 1
                    }
                  />

                  {/* Sentence List */}
                  <SentenceList
                    sentences={activeLesson.sentences}
                    activeSegmentIndex={activeSegmentIndex}
                    isPlaying={isPlaying}
                    onSelectSegment={handleSelectSegment}
                    savedProgressMap={activeLessonProgress}
                  />
                </div>

                {/* Right Column (Dictation Studio) */}
                <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                  <DictationStudio
                    lesson={activeLesson}
                    activeSegmentIndex={activeSegmentIndex}
                    isPlayerReady={isPlayerReady}
                    isLooping={isLooping}
                    onToggleLoop={toggleLoop}
                    onSelectSegment={handleSelectSegment}
                    onReplaySegment={handleReplayCurrent}
                    onSaveProgress={handleSaveSentenceProgress}
                    savedProgressMap={activeLessonProgress}
                    onBookmarkVocabulary={handleBookmarkVocabulary}
                    onAddSegment={handleAddSegment}
                    onImportTranscript={handleImportTranscript}
                    onDeleteSegment={handleDeleteSegment}
                    onAutoFetchTranscript={() => handleAutoFetchTranscript(activeLesson.id)}
                    onUpdateSegmentTranslation={handleUpdateSegmentTranslation}
                    isFetchingTranscript={isAutoFetchingTranscript}
                    getCurrentPlayerTime={getCurrentTime}
                  />

                  {/* Tips box */}
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs space-y-1.5 text-indigo-950">
                    <h5 className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Mẹo luyện nghe &amp; chép chính tả hiệu quả:</span>
                    </h5>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-relaxed">
                      <li>
                        Bấm <strong className="text-slate-800">Nghe lại câu (Ctrl+Space)</strong> để nắm bắt cấu trúc và nhịp điệu.
                      </li>
                      <li>Gõ những từ bạn nghe rõ nhất vào ô văn bản.</li>
                      <li>Nghe lại lần 2 để bổ sung các từ nối, mạo từ và đuôi thì quá khứ/số nhiều.</li>
                      <li>
                        Bật <strong className="text-slate-800">Lặp câu (Alt+L)</strong> nếu muốn nghe câu lặp lại liên tục trong khi gõ.
                      </li>
                      <li>
                        Nhấn <strong className="text-slate-800">Kiểm tra đáp án (Enter)</strong> để xem đối chiếu từ đúng/sai và lưu từ vựng mới.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state when user has no videos at all */
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                <Video className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Bắt đầu với video YouTube bất kỳ
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Dán link video YouTube ở thanh tìm kiếm phía trên để bắt đầu thêm bài học và luyện nghe chép chính tả.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* VIEW 2: MY YOUTUBE VIDEOS */}
        {activeTab === 'lessons' && (
          <LessonsView
            lessons={videosList}
            activeLessonId={activeLesson?.id || ''}
            onSelectLesson={handleSelectLesson}
            onImportCustomVideo={handleImportVideo}
            onDeleteVideo={handleDeleteVideo}
            allProgressMap={allLessonsProgress}
          />
        )}

        {/* VIEW 3: VOCABULARY */}
        {activeTab === 'vocabulary' && (
          <VocabularyView
            vocabularyList={vocabularyList}
            onRemoveVocabulary={handleRemoveVocabulary}
            onJumpToTimestamp={handleJumpToVocabTimestamp}
          />
        )}

        {/* VIEW 4: PROGRESS */}
        {activeTab === 'progress' && (
          <ProgressView
            lessons={videosList}
            allProgressMap={allLessonsProgress}
            onResetAllProgress={handleResetAllProgress}
            onNavigateToPractice={() => setActiveTab('practice')}
          />
        )}
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Cloudflare D1 Sync Modal */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        onSyncComplete={refreshAllData}
      />

      {/* Quick Transcript Import Modal */}
      {activeLesson && (
        <TranscriptImportModal
          isOpen={showQuickTranscriptModal}
          onClose={() => setShowQuickTranscriptModal(false)}
          videoId={activeLesson.videoId}
          lessonTitle={activeLesson.title}
          initialTab="paste"
          onSaveTranscript={handleImportTranscript}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">ListenFlow</span>
            <span>•</span>
            <span>Ứng dụng Luyện nghe &amp; Chép chính tả YouTube</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Powered by official YouTube IFrame Player API</span>
            <span>•</span>
            <span>Lưu trữ nội bộ an toàn (Local-First)</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
