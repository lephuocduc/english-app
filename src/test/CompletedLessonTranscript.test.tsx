import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  isLessonFinished,
  selectHomeLessonId,
  getNextUncompletedLesson,
  getNextSameLevelLesson,
} from '../lib/dictation/resumeManager'
import { CompletedLessonTranscript } from '../features/dictation/CompletedLessonTranscript'
import { LessonsView } from '../features/lessons/LessonsView'
import { storage } from '../lib/storage/storage'
import { App } from '../App'
import type { Lesson, UserLessonProgress, UserSentenceProgress } from '../types'

const sampleLesson: Lesson = {
  id: 'lesson-audio-test-complete',
  videoId: 'audio-test-complete',
  sourceType: 'audio',
  voiceAccent: 'en-GB',
  title: 'Test IT Ops Completion Call',
  description: 'A 2-sentence sample lesson for transcript unlock tests.',
  language: 'en',
  level: 'Beginner',
  sentences: [
    {
      id: 'seg-a1',
      startTime: 0,
      endTime: 4.5,
      text: 'The web server restarted cleanly.',
      translation: 'Máy chủ web đã khởi động lại gọn gàng.',
      hint: 'restarted cleanly',
    },
    {
      id: 'seg-a2',
      startTime: 4.5,
      endTime: 9.2,
      text: 'Monitoring shows healthy traffic now.',
      translation: 'Hệ thống giám sát cho thấy lưu lượng hiện đang ổn định.',
      hint: 'healthy traffic',
    },
  ],
}

describe('Completed Lesson Full Transcript Review', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('1. isLessonFinished helper', () => {
    it('returns false when lesson is empty, missing progress, or partially completed', () => {
      expect(isLessonFinished([], {})).toBe(false)
      expect(isLessonFinished(sampleLesson.sentences, null)).toBe(false)
      expect(
        isLessonFinished(sampleLesson.sentences, {
          'seg-a1': {
            sentenceId: 'seg-a1',
            userInput: 'The web server restarted cleanly.',
            score: 100,
            isRevealed: false,
            attempts: 1,
            completed: true,
            lastAttemptAt: new Date().toISOString(),
          },
          'seg-a2': {
            sentenceId: 'seg-a2',
            userInput: 'Monitoring shows',
            score: 60,
            isRevealed: false,
            attempts: 1,
            completed: false,
            lastAttemptAt: new Date().toISOString(),
          },
        })
      ).toBe(false)
    })

    it('returns true when all sentences are completed or revealed', () => {
      const progress: Record<string, UserSentenceProgress> = {
        'seg-a1': {
          sentenceId: 'seg-a1',
          userInput: 'The web server restarted cleanly.',
          score: 85,
          isRevealed: false,
          attempts: 1,
          completed: true,
          lastAttemptAt: new Date().toISOString(),
        },
        'seg-a2': {
          sentenceId: 'seg-a2',
          userInput: '',
          score: 0,
          isRevealed: true,
          attempts: 0,
          completed: false,
          lastAttemptAt: new Date().toISOString(),
        },
      }
      expect(isLessonFinished(sampleLesson.sentences, progress)).toBe(true)
    })
  })

  describe('2. CompletedLessonTranscript component UI & interactions', () => {
    const completedProgress: Record<string, UserSentenceProgress> = {
      'seg-a1': {
        sentenceId: 'seg-a1',
        userInput: 'The web server restarted cleanly.',
        score: 100,
        isRevealed: false,
        attempts: 1,
        completed: true,
        lastAttemptAt: new Date().toISOString(),
      },
      'seg-a2': {
        sentenceId: 'seg-a2',
        userInput: 'Monitoring shows healthy traffic.',
        score: 80,
        isRevealed: false,
        attempts: 1,
        completed: true,
        lastAttemptAt: new Date().toISOString(),
      },
    }

    it('renders all lines, toggles passage mode and translations, plays full lesson and lines, bookmarks words, and copies', async () => {
      const onSelectSegment = vi.fn()
      const onPlayFullLesson = vi.fn()
      const onBookmarkVocabulary = vi.fn()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        writable: true,
        value: { writeText },
      })

      render(
        <CompletedLessonTranscript
          lesson={sampleLesson}
          activeSegmentIndex={0}
          isPlaying={false}
          isPlayingFullLesson={false}
          savedProgressMap={completedProgress}
          onSelectSegment={onSelectSegment}
          onPlayFullLesson={onPlayFullLesson}
          onBookmarkVocabulary={onBookmarkVocabulary}
        />
      )

      // Play full lesson once
      fireEvent.click(screen.getByRole('button', { name: /Nghe full bài \(1 lần\)/i }))
      expect(onPlayFullLesson).toHaveBeenCalledTimes(1)

      expect(
        screen.getByText('Bài học đã hoàn thành • Full Transcript')
      ).toBeInTheDocument()
      expect(screen.getByText(/2\/2 câu đạt ≥80% • Điểm TB: 90%/i)).toBeInTheDocument()
      expect(screen.getByText('Máy chủ web đã khởi động lại gọn gàng.')).toBeInTheDocument()
      expect(screen.getByText(/Từ khóa: restarted cleanly/i)).toBeInTheDocument()

      // Play sentence #2
      fireEvent.click(screen.getByRole('button', { name: 'Nghe câu 2' }))
      expect(onSelectSegment).toHaveBeenCalledWith(1)

      // Click word token to bookmark vocabulary
      fireEvent.click(screen.getByRole('button', { name: 'cleanly.' }))
      expect(onBookmarkVocabulary).toHaveBeenCalledWith(
        'cleanly',
        'The web server restarted cleanly.',
        0,
        undefined,
        'Máy chủ web đã khởi động lại gọn gàng.'
      )

      // Switch to continuous passage view
      fireEvent.click(screen.getByRole('button', { name: /Đoạn văn liền/i }))
      expect(screen.getByTestId('full-transcript-passage')).toHaveTextContent(
        'The web server restarted cleanly. Monitoring shows healthy traffic now.'
      )
      expect(screen.getByText('Bản dịch toàn bài')).toBeInTheDocument()

      // Copy full passage
      fireEvent.click(screen.getByRole('button', { name: /Sao chép/i }))
      expect(writeText).toHaveBeenCalledWith(
        'The web server restarted cleanly. Monitoring shows healthy traffic now.'
      )

      // Toggle translations off
      fireEvent.click(screen.getByRole('button', { name: /Ẩn dịch/i }))
      expect(screen.queryByText('Bản dịch toàn bài')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Hiện dịch/i })).toBeInTheDocument()
    })
  })

  describe('3. App integration: hides Full Transcript until all sentences finish', () => {
    it('unlocks CompletedLessonTranscript in App only after the final sentence is completed', () => {
      storage.saveVideos([sampleLesson])
      storage.saveActiveLessonId(sampleLesson.id)
      storage.saveSentenceProgress(
        sampleLesson.id,
        {
          sentenceId: 'seg-a1',
          userInput: 'The web server restarted cleanly.',
          score: 100,
          isRevealed: false,
          attempts: 1,
          completed: true,
          lastAttemptAt: new Date().toISOString(),
        },
        'seg-a1'
      )

      const firstRender = render(<App />)
      expect(
        screen.queryByText('Bài học đã hoàn thành • Full Transcript')
      ).not.toBeInTheDocument()
      firstRender.unmount()

      // Complete the second (final) sentence
      storage.saveSentenceProgress(
        sampleLesson.id,
        {
          sentenceId: 'seg-a2',
          userInput: 'Monitoring shows healthy traffic now.',
          score: 90,
          isRevealed: false,
          attempts: 1,
          completed: true,
          lastAttemptAt: new Date().toISOString(),
        },
        'seg-a2'
      )

      render(<App />)
      expect(
        screen.getByText('Bài học đã hoàn thành • Full Transcript')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Máy chủ web đã khởi động lại gọn gàng.')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Hệ thống giám sát cho thấy lưu lượng hiện đang ổn định.')
      ).toBeInTheDocument()
    })

    it('selects in-progress lesson on home page or advances to the next uncompleted lesson when current is done', () => {
      const lesson2: Lesson = {
        ...sampleLesson,
        id: 'lesson-audio-test-next',
        videoId: 'audio-test-next',
        title: 'Next IT Ops Lesson',
        sentences: [
          { id: 'seg-b1', startTime: 0, endTime: 4, text: 'Second lesson first line.' },
          { id: 'seg-b2', startTime: 4, endTime: 8, text: 'Second lesson second line.' },
        ],
      }
      const lesson3: Lesson = {
        ...sampleLesson,
        id: 'lesson-audio-test-third',
        videoId: 'audio-test-third',
        title: 'Third IT Ops Lesson',
        sentences: [
          { id: 'seg-c1', startTime: 0, endTime: 4, text: 'Third lesson first line.' },
          { id: 'seg-c2', startTime: 4, endTime: 8, text: 'Third lesson second line.' },
        ],
      }
      const lessons = [sampleLesson, lesson2, lesson3]

      // 1) When lesson 1 is finished and saved as active, home page advances to lesson 2
      const doneFirstProgress = {
        [sampleLesson.id]: {
          lessonId: sampleLesson.id,
          updatedAt: new Date().toISOString(),
          sentenceProgress: {
            'seg-a1': {
              sentenceId: 'seg-a1',
              userInput: 'ok',
              score: 100,
              isRevealed: false,
              attempts: 1,
              completed: true,
              lastAttemptAt: new Date().toISOString(),
            },
            'seg-a2': {
              sentenceId: 'seg-a2',
              userInput: 'ok',
              score: 100,
              isRevealed: false,
              attempts: 1,
              completed: true,
              lastAttemptAt: new Date().toISOString(),
            },
          },
        },
      }
      expect(selectHomeLessonId(lessons, doneFirstProgress, sampleLesson.id)).toBe(lesson2.id)
      expect(getNextUncompletedLesson(lessons, doneFirstProgress, sampleLesson.id)?.id).toBe(
        lesson2.id
      )

      // 2) When lesson 3 is in progress (1/2), home page resumes lesson 3 even if lesson 1 was saved
      const withInProgress = {
        ...doneFirstProgress,
        [lesson3.id]: {
          lessonId: lesson3.id,
          updatedAt: new Date().toISOString(),
          sentenceProgress: {
            'seg-c1': {
              sentenceId: 'seg-c1',
              userInput: 'ok',
              score: 100,
              isRevealed: false,
              attempts: 1,
              completed: true,
              lastAttemptAt: new Date().toISOString(),
            },
          },
        },
      }
      expect(selectHomeLessonId(lessons, withInProgress, sampleLesson.id)).toBe(lesson3.id)
    })
  })

  describe('4. LessonsView completion status filter', () => {
    it('filters completed and uncompleted lessons accurately', () => {
      const unfinishedLesson: Lesson = {
        ...sampleLesson,
        id: 'lesson-audio-unfinished',
        videoId: 'audio-unfinished',
        title: 'Unfinished IT Ops Call',
        sentences: [
          {
            id: 'seg-u1',
            startTime: 0,
            endTime: 4,
            text: 'Checking the server status now.',
          },
        ],
      }

      const progressMap: Record<string, UserLessonProgress> = {
        [sampleLesson.id]: {
          lessonId: sampleLesson.id,
          lastSentenceId: 'seg-a2',
          updatedAt: new Date().toISOString(),
          sentenceProgress: {
            'seg-a1': {
              sentenceId: 'seg-a1',
              userInput: 'The web server restarted cleanly.',
              score: 100,
              isRevealed: false,
              attempts: 1,
              completed: true,
              lastAttemptAt: new Date().toISOString(),
            },
            'seg-a2': {
              sentenceId: 'seg-a2',
              userInput: 'Monitoring shows healthy traffic now.',
              score: 95,
              isRevealed: false,
              attempts: 1,
              completed: true,
              lastAttemptAt: new Date().toISOString(),
            },
          },
        },
      }

      render(
        <LessonsView
          lessons={[sampleLesson, unfinishedLesson]}
          activeLessonId={sampleLesson.id}
          onSelectLesson={vi.fn()}
          onImportCustomVideo={vi.fn()}
          allProgressMap={progressMap}
        />
      )

      // Defaults to "Chưa hoàn thành"
      expect(screen.queryByText('Test IT Ops Completion Call')).not.toBeInTheDocument()
      expect(screen.getByText('Unfinished IT Ops Call')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Đã hoàn thành \(1\)/i }))
      expect(screen.getByText('Test IT Ops Completion Call')).toBeInTheDocument()
      expect(screen.queryByText('Unfinished IT Ops Call')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Chưa hoàn thành \(1\)/i }))
      expect(screen.queryByText('Test IT Ops Completion Call')).not.toBeInTheDocument()
      expect(screen.getByText('Unfinished IT Ops Call')).toBeInTheDocument()
    })
  })

  describe('5. getNextSameLevelLesson helper & quick next-lesson button', () => {
    it('selects the next uncompleted lesson with the exact same level and source type', () => {
      const a2Lesson1: Lesson = { ...sampleLesson, id: 'a2-1', videoId: 'audio-a2-1', level: 'Beginner' }
      const b1Lesson: Lesson = { ...sampleLesson, id: 'b1-1', videoId: 'audio-b1-1', level: 'Intermediate' }
      const ytBeginner: Lesson = {
        ...sampleLesson,
        id: 'yt-1',
        videoId: 'dQw4w9WgXcQ',
        sourceType: 'youtube',
        level: 'Beginner',
      }
      const a2Lesson2: Lesson = {
        ...sampleLesson,
        id: 'a2-2',
        videoId: 'audio-a2-2',
        level: 'Beginner',
        title: 'Next A2-B1 Call',
      }

      const next = getNextSameLevelLesson([a2Lesson1, b1Lesson, ytBeginner, a2Lesson2], a2Lesson1, {})
      expect(next?.id).toBe('a2-2')

      // Returns null when no other lesson matches the same level + source type
      expect(getNextSameLevelLesson([a2Lesson1, b1Lesson, ytBeginner], a2Lesson1, {})).toBeNull()
    })

    it('renders and triggers the Bài tiếp theo button in CompletedLessonTranscript', () => {
      const onNextLesson = vi.fn()
      render(
        <CompletedLessonTranscript
          lesson={sampleLesson}
          activeSegmentIndex={0}
          isPlaying={false}
          savedProgressMap={{}}
          onSelectSegment={vi.fn()}
          nextLessonTitle="Next A2-B1 Call"
          onNextLesson={onNextLesson}
        />
      )

      const nextBtn = screen.getByRole('button', { name: /Bài tiếp theo/i })
      expect(nextBtn).toHaveAttribute('title', expect.stringContaining('Next A2-B1 Call'))
      fireEvent.click(nextBtn)
      expect(onNextLesson).toHaveBeenCalledTimes(1)
    })
  })
})
