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
  DELETED_VOCABULARY: 'listenflow_deleted_vocab_v1',
}

const DEFAULT_PREFERENCES: StudyPreferences = {
  playbackSpeed: 1.0,
  autoReplayCount: 1,
  volume: 100,
  showInstantHint: false,
  isDarkMode: false,
  isBlindListening: false,
  isFocusMode: false,
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
      typeof (item as Partial<YouTubeVideo>).id === 'string' &&
      typeof (item as Partial<YouTubeVideo>).videoId === 'string'
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

    // Synchronize to Cloudflare D1 in background
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      apiClient
        .saveSentenceProgress(lessonId, sentenceProgress.sentenceId, {
          userInput: sentenceProgress.userInput,
          score: sentenceProgress.score,
          isRevealed: sentenceProgress.isRevealed,
          attemptsCount: sentenceProgress.attempts,
          completed: sentenceProgress.completed,
        })
        .catch(() => {})
    }
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

  loadDeletedVocab(): Set<string> {
    const stored = safeGetItem<string[]>(
      STORAGE_KEYS.DELETED_VOCABULARY,
      (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
    )
    return new Set(stored || [])
  },

  addDeletedVocabTombstone(id: string, word?: string): void {
    const set = this.loadDeletedVocab()
    if (id) set.add(id)
    if (word) set.add(word.trim().toLowerCase())
    safeSetItem(STORAGE_KEYS.DELETED_VOCABULARY, Array.from(set))
  },

  removeDeletedVocabTombstone(id: string, word?: string): void {
    const set = this.loadDeletedVocab()
    if (id) set.delete(id)
    if (word) set.delete(word.trim().toLowerCase())
    safeSetItem(STORAGE_KEYS.DELETED_VOCABULARY, Array.from(set))
  },

  addVocabulary(item: VocabularyItem): VocabularyItem[] {
    this.removeDeletedVocabTombstone(item.id, item.word)
    const current = this.loadVocabulary()
    // Avoid duplicate words in same lesson
    const filtered = current.filter(
      (v) => !(v.word.toLowerCase() === item.word.toLowerCase() && v.videoId === item.videoId)
    )
    const updated = [item, ...filtered]
    this.saveVocabulary(updated)
    return updated
  },

  updateVocabulary(updatedItem: VocabularyItem): VocabularyItem[] {
    const current = this.loadVocabulary()
    const targetWord = updatedItem.word.trim().toLowerCase()
    const targetVid = (updatedItem.videoId || '').trim()
    const index = current.findIndex(
      (item) =>
        item.id === updatedItem.id ||
        (item.word.trim().toLowerCase() === targetWord &&
          (item.videoId || '').trim() === targetVid)
    )
    let updated: VocabularyItem[]
    if (index >= 0) {
      updated = [...current]
      updated[index] = { ...current[index], ...updatedItem }
    } else {
      updated = [updatedItem, ...current]
    }
    this.saveVocabulary(updated)
    return updated
  },

  updateMultipleVocabulary(items: VocabularyItem[]): VocabularyItem[] {
    const current = this.loadVocabulary()
    const idMap = new Map(items.map((it) => [it.id, it]))
    const wordKeyMap = new Map(
      items.map((it) => [
        `${it.word.trim().toLowerCase()}:::${(it.videoId || '').trim()}`,
        it,
      ])
    )
    const updated = current.map((it) => {
      const matchById = idMap.get(it.id)
      if (matchById) return { ...it, ...matchById }
      const matchByWord = wordKeyMap.get(
        `${it.word.trim().toLowerCase()}:::${(it.videoId || '').trim()}`
      )
      if (matchByWord) return { ...it, ...matchByWord }
      return it
    })
    this.saveVocabulary(updated)
    return updated
  },

  removeVocabulary(id: string): VocabularyItem[] {
    const current = this.loadVocabulary()
    const toDelete = current.find((item) => item.id === id)
    const updated = current.filter((item) => item.id !== id)
    this.saveVocabulary(updated)

    // Save tombstone to prevent syncWithCloud from resurrecting it
    this.addDeletedVocabTombstone(id, toDelete?.word)

    // Mirror to Cloudflare D1 in background
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      apiClient.deleteVocabulary(id).catch(() => {})
      if (toDelete?.word) {
        apiClient.deleteVocabulary(toDelete.word).catch(() => {})
      }
    }

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
    const loaded = safeGetItem(STORAGE_KEYS.VIDEOS, isYouTubeVideoList)
    if (!loaded) return null
    return loaded.map((item) => ({
      ...item,
      title: item.title || `YouTube: ${item.videoId}`,
      sentences: Array.isArray(item.sentences) ? item.sentences : [],
    }))
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
    const toDelete = current.find(
      (v) => v.id === videoIdOrId || v.videoId === videoIdOrId
    )
    const updated = current.filter(
      (v) => v.id !== videoIdOrId && v.videoId !== videoIdOrId
    )
    this.saveVideos(updated)

    // Mirror to Cloudflare D1 API in background
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      apiClient.deleteLesson(videoIdOrId).catch(() => {})
      if (toDelete && toDelete.id !== videoIdOrId) {
        apiClient.deleteLesson(toDelete.id).catch(() => {})
      }
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

  async syncWithCloud(): Promise<{
    lessonsCount: number
    vocabCount: number
    progressCount: number
  }> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return { lessonsCount: 0, vocabCount: 0, progressCount: 0 }
    }

    try {
      const [cloudLessons, cloudVocab] = await Promise.all([
        apiClient.listLessons(),
        apiClient.listVocabulary(),
      ])

      const local = this.loadVideos() || []
      const mergedMap = new Map<string, YouTubeVideo>()

      // 1. Seed with cloud lessons
      for (const cl of cloudLessons) {
        mergedMap.set(cl.id, {
          ...cl,
          sentences: Array.isArray(cl.sentences) ? cl.sentences : [],
        })
      }

      // 2. Merge local lessons, preserving better titles & richer sentences
      for (const l of local) {
        const existing =
          mergedMap.get(l.id) ||
          Array.from(mergedMap.values()).find((x) => x.videoId === l.videoId)

        if (existing) {
          const betterSentences =
            l.sentences && l.sentences.length > (existing.sentences?.length || 0)
              ? l.sentences
              : existing.sentences || []
          const betterTitle =
            l.title &&
            !l.title.startsWith('YouTube: ') &&
            !l.title.startsWith('video-') &&
            l.title !== 'Đang tải tiêu đề YouTube...'
              ? l.title
              : existing.title

          const mergedItem: YouTubeVideo = {
            ...existing,
            ...l,
            title: betterTitle,
            sentences: betterSentences,
          }
          mergedMap.set(mergedItem.id, mergedItem)

          // If local had sentences but cloud didn't, push to cloud
          if (l.sentences && l.sentences.length > (existing.sentences?.length || 0)) {
            apiClient
              .createLesson({
                id: mergedItem.id,
                videoId: mergedItem.videoId,
                title: mergedItem.title,
                description: mergedItem.description,
                language: mergedItem.language,
                level: mergedItem.level,
                sentences: betterSentences,
              })
              .catch(() => {})
          }
        } else {
          const normalized: YouTubeVideo = {
            ...l,
            sentences: Array.isArray(l.sentences) ? l.sentences : [],
          }
          mergedMap.set(normalized.id, normalized)
          apiClient
            .createLesson({
              id: normalized.id,
              videoId: normalized.videoId,
              title: normalized.title,
              description: normalized.description,
              language: normalized.language,
              level: normalized.level,
              sentences: normalized.sentences,
            })
            .catch(() => {})
        }
      }

      const merged = Array.from(mergedMap.values())
      this.saveVideos(merged)

      const localV = this.loadVocabulary() || []
      const deletedTombstones = this.loadDeletedVocab()

      // 1. Filter out any cloud vocabulary that has been deleted locally
      const validCloudVocab = cloudVocab.filter(
        (c) =>
          !deletedTombstones.has(c.id) &&
          !deletedTombstones.has(c.word.trim().toLowerCase())
      )

      // Background cleanup: ensure server deletes any tombstones
      if (deletedTombstones.size > 0) {
        for (const tombstone of deletedTombstones) {
          apiClient.deleteVocabulary(tombstone).catch(() => {})
        }
      }

      // 2. Merge local vocabulary with valid cloud vocabulary
      // A word is logically identified by: word.trim().toLowerCase() + videoId, or by ID
      const getVocabKey = (item: { word: string; videoId?: string }) =>
        `${item.word.trim().toLowerCase()}:::${(item.videoId || '').trim()}`

      const vocabMap = new Map<string, VocabularyItem>()
      const idToKeyMap = new Map<string, string>()

      // Step A: Seed with valid cloud vocabulary (deduplicating any duplicate cloud records)
      for (const c of validCloudVocab) {
        if (!c.word || !c.word.trim()) continue
        const key = getVocabKey(c)
        const existing = vocabMap.get(key)
        if (!existing) {
          vocabMap.set(key, c)
          if (c.id) idToKeyMap.set(c.id, key)
        } else {
          const mergedCloud: VocabularyItem = {
            ...existing,
            ...c,
            meaning: c.meaning || existing.meaning,
            contextSentence: c.contextSentence || existing.contextSentence,
            contextSentenceTranslation:
              c.contextSentenceTranslation || existing.contextSentenceTranslation,
            lessonTitle: c.lessonTitle || existing.lessonTitle,
          }
          vocabMap.set(key, mergedCloud)
          if (c.id) idToKeyMap.set(c.id, key)
        }
      }

      // Step B: Overlay local vocabulary items
      // CRITICAL: Local SRS progress (mastered, dueDate, repetitions, interval, easeFactor, lastReviewedAt)
      // and translations MUST PREVAIL over stripped cloud items so that page refresh never resets review state!
      for (const v of localV) {
        const isDeleted =
          deletedTombstones.has(v.id) ||
          deletedTombstones.has(v.word.trim().toLowerCase())
        if (isDeleted || !v.word || !v.word.trim()) continue

        const key = getVocabKey(v)
        const matchedKey = vocabMap.has(key)
          ? key
          : v.id
            ? idToKeyMap.get(v.id)
            : undefined
        const cloudMatch = matchedKey ? vocabMap.get(matchedKey) : undefined

        if (cloudMatch) {
          // Merge: Cloud fields + Local fields (Local SRS fields and edits take precedence!)
          const targetKey = matchedKey || key
          const mergedItem: VocabularyItem = {
            ...cloudMatch,
            ...v,
            meaning: v.meaning || cloudMatch.meaning || '',
            contextSentence: v.contextSentence || cloudMatch.contextSentence || '',
            contextSentenceTranslation:
              v.contextSentenceTranslation || cloudMatch.contextSentenceTranslation,
            lessonTitle: v.lessonTitle || cloudMatch.lessonTitle || '',
            videoId: v.videoId || cloudMatch.videoId || '',
            id: v.id || cloudMatch.id,
            savedAt: v.savedAt || cloudMatch.savedAt || new Date().toISOString(),

            // STRICT SRS RETENTION: Never wipe user review state!
            mastered: v.mastered ?? cloudMatch.mastered ?? false,
            interval: v.interval ?? cloudMatch.interval,
            easeFactor: v.easeFactor ?? cloudMatch.easeFactor,
            repetitions: v.repetitions ?? cloudMatch.repetitions,
            dueDate: v.dueDate || cloudMatch.dueDate,
            lastReviewedAt: v.lastReviewedAt || cloudMatch.lastReviewedAt,
          }
          vocabMap.set(targetKey, mergedItem)
        } else {
          // Word exists locally but not in cloud: keep it and sync to cloud
          vocabMap.set(key, v)
          if (v.id) idToKeyMap.set(v.id, key)
          apiClient.saveVocabulary(v).catch(() => {})
        }
      }

      const mergedV = Array.from(vocabMap.values())
      this.saveVocabulary(mergedV)

      // Sync progress across lessons
      let progressCount = 0
      for (const l of merged) {
        // Upload local progress to cloud
        const localProg = this.loadLessonProgress(l.id)
        if (localProg?.sentenceProgress) {
          for (const [segId, sp] of Object.entries(localProg.sentenceProgress)) {
            apiClient
              .saveSentenceProgress(l.id, segId, {
                userInput: sp.userInput,
                score: sp.score,
                isRevealed: sp.isRevealed,
                attemptsCount: sp.attempts,
                completed: sp.completed,
              })
              .catch(() => {})
            progressCount++
          }
        }

        // Fetch cloud progress and merge
        const cloudProg = await apiClient.getLessonProgress(l.id)
        if (cloudProg?.sentenceProgress && Object.keys(cloudProg.sentenceProgress).length > 0) {
          const current = this.loadLessonProgress(l.id) || {
            lessonId: l.id,
            sentenceProgress: {},
            lastSentenceId: cloudProg.lastSentenceId,
            updatedAt: new Date().toISOString(),
          }
          current.sentenceProgress = {
            ...cloudProg.sentenceProgress,
            ...current.sentenceProgress,
          }
          safeSetItem(`${STORAGE_KEYS.LESSON_PROGRESS_PREFIX}${l.id}`, current)
          progressCount += Object.keys(cloudProg.sentenceProgress).length
        }
      }

      return {
        lessonsCount: merged.length,
        vocabCount: mergedV.length,
        progressCount,
      }
    } catch {
      return { lessonsCount: 0, vocabCount: 0, progressCount: 0 }
    }
  },
}
