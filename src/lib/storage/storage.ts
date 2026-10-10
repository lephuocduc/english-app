import type {
  StudyPreferences,
  UserLessonProgress,
  UserSentenceProgress,
  VocabularyItem,
  YouTubeVideo,
  SentenceSegment,
} from '../../types'
import { apiClient } from '../api/client'

const STORAGE_KEYS = {
  PREFERENCES: 'listenflow_preferences_v1',
  LESSON_PROGRESS_PREFIX: 'listenflow_progress_',
  VOCABULARY: 'listenflow_vocabulary_v1',
  ACTIVE_LESSON_ID: 'listenflow_active_lesson_id_v1',
  VIDEOS: 'listenflow_youtube_videos_v2',
}

const DEFAULT_PREFERENCES: StudyPreferences = {
  playbackSpeed: 1.0,
  autoReplayCount: 1,
  volume: 100,
  showInstantHint: false,
}

/**
 * Checks if localStorage is available and functioning
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__listenflow_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Safely saves item to localStorage with quota error protection
 */
function safeSetItem(key: string, value: unknown): boolean {
  if (!isLocalStorageAvailable()) return false
  try {
    const serialized = JSON.stringify(value)
    window.localStorage.setItem(key, serialized)
    return true
  } catch (err) {
    console.warn(`[ListenFlow Storage] Failed to write key "${key}":`, err)
    return false
  }
}

/**
 * Safely gets and parses an item from localStorage
 */
function safeGetItem<T>(key: string, validator: (val: unknown) => val is T): T | null {
  if (!isLocalStorageAvailable()) return null
  try {
    const item = window.localStorage.getItem(key)
    if (!item) return null
    const parsed = JSON.parse(item)
    if (validator(parsed)) {
      return parsed
    }
    console.warn(`[ListenFlow Storage] Invalid data schema for key "${key}". Resetting.`)
    return null
  } catch (err) {
    console.warn(`[ListenFlow Storage] Failed to read or parse key "${key}":`, err)
    return null
  }
}

// Type Guards for schema validation
function isStudyPreferences(val: unknown): val is StudyPreferences {
  if (!val || typeof val !== 'object') return false
  const p = val as Partial<StudyPreferences>
  return (
    typeof p.playbackSpeed === 'number' &&
    typeof p.autoReplayCount === 'number' &&
    typeof p.volume === 'number'
  )
}

function isUserLessonProgress(val: unknown): val is UserLessonProgress {
  if (!val || typeof val !== 'object') return false
  const p = val as Partial<UserLessonProgress>
  return (
    typeof p.lessonId === 'string' &&
    typeof p.sentenceProgress === 'object' &&
    p.sentenceProgress !== null &&
    typeof p.updatedAt === 'string'
  )
}

function isVocabularyList(val: unknown): val is VocabularyItem[] {
  if (!Array.isArray(val)) return false
  return val.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.word === 'string'
  )
}

function isYouTubeVideoList(val: unknown): val is YouTubeVideo[] {
  if (!Array.isArray(val)) return false
  return val.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.videoId === 'string' &&
      typeof item.title === 'string' &&
      Array.isArray(item.sentences)
  )
}

// Public Storage API
export const storage = {
  loadPreferences(): StudyPreferences {
    const loaded = safeGetItem(STORAGE_KEYS.PREFERENCES, isStudyPreferences)
    return loaded ? { ...DEFAULT_PREFERENCES, ...loaded } : DEFAULT_PREFERENCES
  },

  savePreferences(prefs: StudyPreferences): void {
    safeSetItem(STORAGE_KEYS.PREFERENCES, prefs)
  },

  loadLessonProgress(lessonId: string): UserLessonProgress | null {
    return safeGetItem(
      `${STORAGE_KEYS.LESSON_PROGRESS_PREFIX}${lessonId}`,
      isUserLessonProgress
    )
  },

  saveSentenceProgress(
    lessonId: string,
    sentenceProgress: UserSentenceProgress,
    lastSentenceId: string
  ): void {
    const current = this.loadLessonProgress(lessonId) || {
      lessonId,
      sentenceProgress: {},
      lastSentenceId,
      updatedAt: new Date().toISOString(),
    }

    current.sentenceProgress[sentenceProgress.sentenceId] = sentenceProgress
    current.lastSentenceId = lastSentenceId
    current.updatedAt = new Date().toISOString()

    safeSetItem(`${STORAGE_KEYS.LESSON_PROGRESS_PREFIX}${lessonId}`, current)
  },

  loadActiveLessonId(): string | null {
    if (!isLocalStorageAvailable()) return null
    try {
      return window.localStorage.getItem(STORAGE_KEYS.ACTIVE_LESSON_ID)
    } catch {
      return null
    }
  },

  saveActiveLessonId(lessonId: string): void {
    if (!isLocalStorageAvailable()) return
    try {
      window.localStorage.setItem(STORAGE_KEYS.ACTIVE_LESSON_ID, lessonId)
    } catch {
      // ignore
    }
  },

  loadVocabulary(): VocabularyItem[] {
    const loaded = safeGetItem(STORAGE_KEYS.VOCABULARY, isVocabularyList)
    return loaded || []
  },

  saveVocabulary(items: VocabularyItem[]): void {
    safeSetItem(STORAGE_KEYS.VOCABULARY, items)
  },

  addVocabulary(item: VocabularyItem): VocabularyItem[] {
    const current = this.loadVocabulary()
    // Avoid duplicate words in same lesson
    const filtered = current.filter(
      (v) => !(v.word.toLowerCase() === item.word.toLowerCase() && v.videoId === item.videoId)
    )
    const updated = [item, ...filtered]
    this.saveVocabulary(updated)
    return updated
  },

  removeVocabulary(id: string): VocabularyItem[] {
    const current = this.loadVocabulary()
    const updated = current.filter((item) => item.id !== id)
    this.saveVocabulary(updated)
    return updated
  },

  clearAllProgress(): void {
    if (!isLocalStorageAvailable()) return
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key && (key.startsWith('listenflow_') || key.startsWith(STORAGE_KEYS.LESSON_PROGRESS_PREFIX))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k))
    } catch (err) {
      console.warn('Failed to clear storage:', err)
    }
  },

  loadVideos(): YouTubeVideo[] | null {
    return safeGetItem(STORAGE_KEYS.VIDEOS, isYouTubeVideoList)
  },

  saveVideos(videos: YouTubeVideo[]): void {
    safeSetItem(STORAGE_KEYS.VIDEOS, videos)
  },

  addVideo(video: YouTubeVideo): YouTubeVideo[] {
    const current = this.loadVideos() || []
    const existingIndex = current.findIndex(
      (v) => v.id === video.id || v.videoId === video.videoId
    )
    let updated: YouTubeVideo[]
    if (existingIndex >= 0) {
      updated = [...current]
      updated[existingIndex] = { ...current[existingIndex], ...video }
    } else {
      updated = [video, ...current]
    }
    this.saveVideos(updated)

    // Mirror to Cloudflare D1 API in background if online
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      apiClient
        .createLesson({
          id: video.id,
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          language: video.language,
          level: video.level,
          sentences: video.sentences,
        })
        .catch(() => {})
    }

    return updated
  },

  deleteVideo(videoIdOrId: string): YouTubeVideo[] {
    const current = this.loadVideos() || []
    const updated = current.filter(
      (v) => v.id !== videoIdOrId && v.videoId !== videoIdOrId
    )
    this.saveVideos(updated)

    // Mirror to Cloudflare D1 API in background
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      apiClient.deleteLesson(videoIdOrId).catch(() => {})
    }

    return updated
  },

  updateVideoSegments(videoIdOrId: string, sentences: SentenceSegment[]): YouTubeVideo[] {
    const current = this.loadVideos() || []
    let updatedVideo: YouTubeVideo | undefined
    const updated = current.map((v) => {
      if (v.id === videoIdOrId || v.videoId === videoIdOrId) {
        updatedVideo = { ...v, sentences }
        return updatedVideo
      }
      return v
    })
    this.saveVideos(updated)

    // Mirror to Cloudflare D1 API in background
    if (typeof window !== 'undefined' && typeof fetch === 'function' && updatedVideo) {
      apiClient.addSegments(updatedVideo.id, sentences).catch(() => {})
    }

    return updated
  },

  async syncWithCloud(): Promise<{ lessonsCount: number; vocabCount: number }> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return { lessonsCount: 0, vocabCount: 0 }
    }

    try {
      const [cloudLessons, cloudVocab] = await Promise.all([
        apiClient.listLessons(),
        apiClient.listVocabulary(),
      ])

      if (cloudLessons.length > 0) {
        const local = this.loadVideos() || []
        const merged = [...cloudLessons]
        for (const l of local) {
          if (!merged.some((c) => c.videoId === l.videoId || c.id === l.id)) {
            merged.push(l)
          }
        }
        this.saveVideos(merged)
      }

      if (cloudVocab.length > 0) {
        const localV = this.loadVocabulary() || []
        const mergedV = [...cloudVocab]
        for (const v of localV) {
          if (!mergedV.some((c) => c.word.toLowerCase() === v.word.toLowerCase() && c.videoId === v.videoId)) {
            mergedV.push(v)
          }
        }
        this.saveVocabulary(mergedV)
      }

      return {
        lessonsCount: cloudLessons.length,
        vocabCount: cloudVocab.length,
      }
    } catch {
      return { lessonsCount: 0, vocabCount: 0 }
    }
  },
}
