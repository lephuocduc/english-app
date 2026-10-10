import { beforeEach, describe, expect, it } from 'vitest'
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
})
