import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storage } from '../lib/storage/storage'
import type { UserSentenceProgress } from '../types'

describe('Local Storage Persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads default preferences if nothing is saved', () => {
    const prefs = storage.loadPreferences()
    expect(prefs.playbackSpeed).toBe(1.0)
    expect(prefs.volume).toBe(100)
  })

  it('saves and reloads updated preferences', () => {
    storage.savePreferences({
      playbackSpeed: 0.75,
      autoReplayCount: 2,
      volume: 80,
      showInstantHint: true,
    })
    const loaded = storage.loadPreferences()
    expect(loaded.playbackSpeed).toBe(0.75)
    expect(loaded.showInstantHint).toBe(true)
  })

  it('handles invalid preferences JSON safely by falling back to defaults', () => {
    window.localStorage.setItem('listenflow_preferences_v1', 'corrupted {json}')
    const loaded = storage.loadPreferences()
    expect(loaded.playbackSpeed).toBe(1.0)
  })

  it('saves and retrieves sentence progress', () => {
    const progress: UserSentenceProgress = {
      sentenceId: 's-1',
      userInput: 'Hello world',
      score: 100,
      isRevealed: false,
      attempts: 1,
      completed: true,
      lastAttemptAt: new Date().toISOString(),
    }
    storage.saveSentenceProgress('lesson-test', progress, 's-1')

    const loadedLesson = storage.loadLessonProgress('lesson-test')
    expect(loadedLesson).not.toBeNull()
    expect(loadedLesson?.sentenceProgress['s-1']?.score).toBe(100)
    expect(loadedLesson?.sentenceProgress['s-1']?.userInput).toBe('Hello world')
  })

  it('adds and removes vocabulary items without duplicates', () => {
    storage.addVocabulary({
      id: 'v-1',
      word: 'commencement',
      contextSentence: 'I am honored to be with you today at your commencement...',
      timestamp: 25,
      videoId: 'UF8uR6Z6KLc',
      lessonTitle: 'Steve Jobs',
      savedAt: new Date().toISOString(),
    })

    const list = storage.loadVocabulary()
    expect(list).toHaveLength(1)
    expect(list[0].word).toBe('commencement')

    storage.removeVocabulary('v-1')
    expect(storage.loadVocabulary()).toHaveLength(0)
  })

  it('saves, loads, and manages YouTube videos in storage', () => {
    expect(storage.loadVideos()).toBeNull()

    const video = {
      id: 'video-123',
      videoId: '12345678901',
      title: 'Test YouTube Video',
      sentences: [
        { id: 'seg-1', startTime: 0, endTime: 5, text: 'Hello world' }
      ]
    }

    storage.saveVideos([video])
    const loaded = storage.loadVideos()
    expect(loaded).toHaveLength(1)
    expect(loaded?.[0].title).toBe('Test YouTube Video')

    // Add another video
    storage.addVideo({
      id: 'video-456',
      videoId: 'abcdefghijk',
      title: 'Second Video',
      sentences: []
    })
    expect(storage.loadVideos()).toHaveLength(2)

    // Update segments
    storage.updateVideoSegments('video-456', [
      { id: 'seg-new', startTime: 10, endTime: 15, text: 'New segment' }
    ])
    const updated = storage.loadVideos()
    expect(updated?.find((v) => v.id === 'video-456')?.sentences).toHaveLength(1)

    // Delete video
    storage.deleteVideo('video-123')
    expect(storage.loadVideos()).toHaveLength(1)
    expect(storage.loadVideos()?.[0].id).toBe('video-456')
  })

  it('syncWithCloud does not resurrect deleted vocabulary words from cloud', async () => {
    const { apiClient } = await import('../lib/api/client')
    const listLessonsSpy = vi.spyOn(apiClient, 'listLessons').mockResolvedValue([])
    const listVocabSpy = vi.spyOn(apiClient, 'listVocabulary').mockResolvedValue([
      {
        id: 'v-deleted',
        word: 'perseverance',
        meaning: 'Sự kiên trì',
        contextSentence: 'With perseverance you succeed',
        timestamp: 10,
        videoId: 'abc',
        lessonTitle: 'Test Lesson',
        savedAt: new Date().toISOString(),
      },
    ])
    const deleteVocabSpy = vi.spyOn(apiClient, 'deleteVocabulary').mockResolvedValue(true)

    // Add and then remove the word
    storage.addVocabulary({
      id: 'v-deleted',
      word: 'perseverance',
      contextSentence: 'With perseverance you succeed',
      timestamp: 10,
      videoId: 'abc',
      lessonTitle: 'Test Lesson',
      savedAt: new Date().toISOString(),
    })
    expect(storage.loadVocabulary()).toHaveLength(1)

    // User deletes the word
    storage.removeVocabulary('v-deleted')
    expect(storage.loadVocabulary()).toHaveLength(0)

    // Now page syncs with cloud
    await storage.syncWithCloud()

    // Vocabulary must STILL be empty - NOT resurrected from cloud!
    expect(storage.loadVocabulary()).toHaveLength(0)
    expect(deleteVocabSpy).toHaveBeenCalledWith('v-deleted')

    listLessonsSpy.mockRestore()
    listVocabSpy.mockRestore()
    deleteVocabSpy.mockRestore()
  })

  it('syncWithCloud preserves SRS review state (mastered, dueDate, repetitions, interval) and does not reset to due', async () => {
    const { apiClient } = await import('../lib/api/client')
    const { isWordDue } = await import('../lib/srs/sm2')

    // Local word reviewed with "Easy" (Rating 4) -> 4 days interval, 1 repetition, future dueDate
    const reviewedWord = {
      id: 'vocab-easy-1',
      word: 'challenge',
      meaning: 'thách thức',
      contextSentence: 'Overcoming this challenge makes us stronger',
      timestamp: 15,
      videoId: 'vid-xyz',
      lessonTitle: 'Advanced English',
      savedAt: '2026-10-11T10:00:00.000Z',
      mastered: false,
      interval: 4,
      repetitions: 1,
      easeFactor: 2.65,
      dueDate: '2026-10-15',
      lastReviewedAt: '2026-10-11T10:30:00.000Z',
    }
    storage.saveVocabulary([reviewedWord])

    // Cloudflare D1 returns the word with basic schema (NO SRS fields)
    const listLessonsSpy = vi.spyOn(apiClient, 'listLessons').mockResolvedValue([])
    const listVocabSpy = vi.spyOn(apiClient, 'listVocabulary').mockResolvedValue([
      {
        id: 'vocab-easy-1',
        word: 'challenge',
        meaning: 'thách thức',
        contextSentence: 'Overcoming this challenge makes us stronger',
        timestamp: 15,
        videoId: 'vid-xyz',
        lessonTitle: 'Advanced English',
        savedAt: '2026-10-11T10:00:00.000Z',
      },
    ])

    // Page refresh triggers cloud sync
    await storage.syncWithCloud()

    // Vocabulary MUST retain local SRS review progress!
    const reloaded = storage.loadVocabulary()
    expect(reloaded).toHaveLength(1)
    const item = reloaded[0]
    expect(item.word).toBe('challenge')
    expect(item.interval).toBe(4)
    expect(item.repetitions).toBe(1)
    expect(item.easeFactor).toBe(2.65)
    expect(item.dueDate).toBe('2026-10-15')
    expect(item.lastReviewedAt).toBe('2026-10-11T10:30:00.000Z')
    expect(item.mastered).toBe(false)

    // Crucial check: Is this word due today (2026-10-11)?
    // It must NOT be due!
    const isDue = isWordDue(item, new Date('2026-10-11T15:00:00Z'))
    expect(isDue).toBe(false)

    listLessonsSpy.mockRestore()
    listVocabSpy.mockRestore()
  })

  it('syncWithCloud preserves mastered status and prevents word from becoming due on refresh', async () => {
    const { apiClient } = await import('../lib/api/client')
    const { isWordDue } = await import('../lib/srs/sm2')

    // Local word marked as mastered
    const masteredWord = {
      id: 'vocab-mastered-1',
      word: 'resilience',
      meaning: 'sự kiên cường',
      contextSentence: 'Show resilience in tough times',
      timestamp: 25,
      videoId: 'vid-xyz',
      lessonTitle: 'Advanced English',
      savedAt: '2026-10-10T10:00:00.000Z',
      mastered: true,
      interval: 30,
      repetitions: 4,
      easeFactor: 2.8,
      dueDate: '2026-11-10',
      lastReviewedAt: '2026-10-10T12:00:00.000Z',
    }
    storage.saveVocabulary([masteredWord])

    // Cloud returns without mastered flag
    const listLessonsSpy = vi.spyOn(apiClient, 'listLessons').mockResolvedValue([])
    const listVocabSpy = vi.spyOn(apiClient, 'listVocabulary').mockResolvedValue([
      {
        id: 'vocab-mastered-1',
        word: 'resilience',
        meaning: 'sự kiên cường',
        contextSentence: 'Show resilience in tough times',
        timestamp: 25,
        videoId: 'vid-xyz',
        lessonTitle: 'Advanced English',
        savedAt: '2026-10-10T10:00:00.000Z',
      },
    ])

    await storage.syncWithCloud()

    const reloaded = storage.loadVocabulary()
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0].mastered).toBe(true)
    expect(isWordDue(reloaded[0], new Date('2026-10-11T15:00:00Z'))).toBe(false)

    listLessonsSpy.mockRestore()
    listVocabSpy.mockRestore()
  })

  it('updateVocabulary updates by matching word and videoId if id differs', () => {
    storage.saveVocabulary([
      {
        id: 'id-old-from-cloud',
        word: 'flourish',
        meaning: 'phát triển mạnh',
        contextSentence: 'Plants flourish in sunlight',
        timestamp: 5,
        videoId: 'vid-plants',
        lessonTitle: 'Nature',
        savedAt: '2026-10-10T10:00:00.000Z',
      },
    ])

    // Update with a different client-generated ID but same word and video
    const updated = storage.updateVocabulary({
      id: 'id-new-client',
      word: 'flourish',
      meaning: 'phát triển rực rỡ',
      contextSentence: 'Plants flourish in sunlight',
      timestamp: 5,
      videoId: 'vid-plants',
      lessonTitle: 'Nature',
      savedAt: '2026-10-10T10:00:00.000Z',
      interval: 7,
      repetitions: 2,
      dueDate: '2026-10-18',
    })

    expect(updated).toHaveLength(1)
    expect(updated[0].meaning).toBe('phát triển rực rỡ')
    expect(updated[0].interval).toBe(7)
    expect(updated[0].repetitions).toBe(2)
  })

  it('guarantees vocabulary is NOT written to or loaded from localStorage (100% Cloud-First)', () => {
    // Save vocabulary
    storage.saveVocabulary([
      {
        id: 'v-cloud-only',
        word: 'cloudy',
        meaning: 'có mây',
        contextSentence: 'The sky is cloudy',
        timestamp: 1,
        videoId: 'v1',
        lessonTitle: 'Weather',
        savedAt: new Date().toISOString(),
      },
    ])

    // LocalStorage must NOT contain the vocabulary key
    expect(window.localStorage.getItem('listenflow_vocabulary_v1')).toBeNull()
    expect(window.localStorage.getItem('listenflow_deleted_vocab_v1')).toBeNull()

    // Add another word
    storage.addVocabulary({
      id: 'v-cloud-only-2',
      word: 'sunny',
      contextSentence: 'Sunny day',
      timestamp: 2,
      videoId: 'v1',
      lessonTitle: 'Weather',
      savedAt: new Date().toISOString(),
    })

    // LocalStorage still must NOT contain vocabulary
    expect(window.localStorage.getItem('listenflow_vocabulary_v1')).toBeNull()

    // Remove word
    storage.removeVocabulary('v-cloud-only-2')
    expect(window.localStorage.getItem('listenflow_deleted_vocab_v1')).toBeNull()
  })
})


