import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { isLessonFinished } from '../lib/dictation/resumeManager'
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

      expect(screen.getByText('Test IT Ops Completion Call')).toBeInTheDocument()
      expect(screen.getByText('Unfinished IT Ops Call')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Đã hoàn thành \(1\)/i }))
      expect(screen.getByText('Test IT Ops Completion Call')).toBeInTheDocument()
      expect(screen.queryByText('Unfinished IT Ops Call')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Chưa hoàn thành \(1\)/i }))
      expect(screen.queryByText('Test IT Ops Completion Call')).not.toBeInTheDocument()
      expect(screen.getByText('Unfinished IT Ops Call')).toBeInTheDocument()
    })
  })
})
