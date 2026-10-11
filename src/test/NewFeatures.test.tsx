import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DictationStudio } from '../features/dictation/DictationStudio'
import { YouTubePlayerView } from '../features/youtube/YouTubePlayerView'
import { VocabularyView } from '../features/vocabulary/VocabularyView'
import { translateToVietnamese, cleanWord } from '../lib/translation/translator'
import { storage } from '../lib/storage/storage'
import App from '../App'
import type { Lesson, SentenceSegment, VocabularyItem } from '../types'

const mockSentence: SentenceSegment = {
  id: 'seg-1',
  startTime: 10,
  endTime: 15,
  text: 'Stay hungry, stay foolish.',
  translation: 'Hãy cứ khao khát, hãy cứ dại khờ.',
}

const mockSentenceWithoutTrans: SentenceSegment = {
  id: 'seg-2',
  startTime: 16,
  endTime: 22,
  text: 'Never lose faith in opportunities.',
}

const mockLesson: Lesson = {
  id: 'test-lesson',
  title: 'Steve Jobs Speech',
  videoId: 'UF8uR6Z6KLc',
  transcriptSource: 'YouTube Official',
  sentences: [mockSentence, mockSentenceWithoutTrans],
}

describe('User Requested Features Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Word count suggestion and live typing indicator', () => {
    it('suggests the exact word count of the current segment and shows live typed count', () => {
      render(
        <DictationStudio
          lesson={mockLesson}
          activeSegmentIndex={0}
          isPlayerReady={true}
          onSelectSegment={vi.fn()}
          onReplaySegment={vi.fn()}
          onSaveProgress={vi.fn()}
          savedProgressMap={{}}
        />
      )

      // Expected word count for "Stay hungry, stay foolish." is 4 words
      expect(screen.getByText(/Hint: 4 words/i)).toBeInTheDocument()
      expect(screen.getByText(/This sentence has/i)).toBeInTheDocument()

      const textarea = screen.getByPlaceholderText(/Type what you hear \(4 words\)/i)
      expect(textarea).toBeInTheDocument()

      // Type 2 words
      fireEvent.change(textarea, { target: { value: 'Stay hungry' } })
      expect(screen.getByText(/Typed: 2 \/ 4 words/i)).toBeInTheDocument()

      // Type 4 words
      fireEvent.change(textarea, { target: { value: 'Stay hungry, stay foolish.' } })
      expect(screen.getByText(/Typed: 4 \/ 4 words/i)).toBeInTheDocument()
    })
  })

  describe('2. Loop segment playback button', () => {
    it('renders loop button in YouTubePlayerView and triggers onToggleLoop', () => {
      const onToggleLoop = vi.fn()

      const { rerender } = render(
        <YouTubePlayerView
          containerId="test-frame"
          videoId="UF8uR6Z6KLc"
          isReady={true}
          isPlaying={true}
          isLooping={false}
          playerError={null}
          currentSpeed={1.0}
          activeSegment={mockSentence}
          onPlaySegment={vi.fn()}
          onTogglePlayPause={vi.fn()}
          onToggleLoop={onToggleLoop}
          onChangeSpeed={vi.fn()}
        />
      )

      const loopButton = screen.getByRole('button', { name: /Toggle sentence loop/i })
      expect(loopButton).toBeInTheDocument()
      expect(screen.getAllByText(/Loop/i)[0]).toBeInTheDocument()

      fireEvent.click(loopButton)
      expect(onToggleLoop).toHaveBeenCalledTimes(1)

      // Rerender with isLooping = true
      rerender(
        <YouTubePlayerView
          containerId="test-frame"
          videoId="UF8uR6Z6KLc"
          isReady={true}
          isPlaying={true}
          isLooping={true}
          playerError={null}
          currentSpeed={1.0}
          activeSegment={mockSentence}
          onPlaySegment={vi.fn()}
          onTogglePlayPause={vi.fn()}
          onToggleLoop={onToggleLoop}
          onChangeSpeed={vi.fn()}
        />
      )

      expect(screen.getByText(/Loop \(On\)/i)).toBeInTheDocument()
    })

    it('renders loop toggle button in DictationStudio prompt area', () => {
      const onToggleLoop = vi.fn()

      render(
        <DictationStudio
          lesson={mockLesson}
          activeSegmentIndex={0}
          isPlayerReady={true}
          isLooping={true}
          onToggleLoop={onToggleLoop}
          onSelectSegment={vi.fn()}
          onReplaySegment={vi.fn()}
          onSaveProgress={vi.fn()}
          savedProgressMap={{}}
        />
      )

      const loopBtn = screen.getByRole('button', { name: /Loop: On/i })
      expect(loopBtn).toBeInTheDocument()
      fireEvent.click(loopBtn)
      expect(onToggleLoop).toHaveBeenCalledTimes(1)
    })
  })

  describe('3. Vocabulary bookmarking with word translation & video example translation', () => {
    it('cleanWord correctly strips punctuation', () => {
      expect(cleanWord('hungry,')).toBe('hungry')
      expect(cleanWord('"foolish"')).toBe('foolish')
      expect(cleanWord('stay!')).toBe('stay')
    })

    it('translates common dictionary words quickly', async () => {
      const res = await translateToVietnamese('opportunity')
      expect(res).toBe('cơ hội')
    })

    it('displays word meaning, video example, and sentence translation in VocabularyView', () => {
      const vocabItems: VocabularyItem[] = [
        {
          id: 'v-1',
          word: 'opportunity',
          meaning: 'cơ hội',
          contextSentence: 'Never lose faith in opportunities.',
          contextSentenceTranslation: 'Đừng bao giờ mất niềm tin vào các cơ hội.',
          timestamp: 16,
          videoId: 'UF8uR6Z6KLc',
          lessonTitle: 'Steve Jobs Speech',
          savedAt: new Date().toISOString(),
        },
      ]

      render(
        <VocabularyView
          vocabularyList={vocabItems}
          onRemoveVocabulary={vi.fn()}
        />
      )

      expect(screen.getByText(/opportunity/i)).toBeInTheDocument()
      expect(screen.getAllByText(/cơ hội/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Never lose faith in opportunities/i)).toBeInTheDocument()
      expect(screen.getByText(/Đừng bao giờ mất niềm tin vào các cơ hội/i)).toBeInTheDocument()
    })
  })

  describe('4. Vietnamese translation on reveal answer', () => {
    it('displays official or translated Vietnamese text when user clicks "Show Answer"', () => {
      render(
        <DictationStudio
          lesson={mockLesson}
          activeSegmentIndex={0}
          isPlayerReady={true}
          onSelectSegment={vi.fn()}
          onReplaySegment={vi.fn()}
          onSaveProgress={vi.fn()}
          savedProgressMap={{}}
        />
      )

      // Click "Show Answer"
      const revealBtn = screen.getByRole('button', { name: /Show Answer/i })
      fireEvent.click(revealBtn)

      // Expected English transcript
      expect(screen.getByText(/Stay hungry, stay foolish/i)).toBeInTheDocument()

      // Expected Vietnamese translation
      expect(screen.getByText(/Vietnamese Translation:/i)).toBeInTheDocument()
      expect(screen.getByText(/Hãy cứ khao khát, hãy cứ dại khờ/i)).toBeInTheDocument()
    })
  })

  describe('5. Single segment navigation with Alt + ArrowRight and Alt + ArrowLeft (no double jump)', () => {
    const multiSegmentLesson: Lesson = {
      id: 'multi-lesson-123',
      title: 'Testing 3 Segments Navigation',
      videoId: 'UF8uR6Z6KLc',
      transcriptSource: 'YouTube Transcript',
      sentences: [
        { id: 's1', startTime: 0, endTime: 5, text: 'First sentence segment.' },
        { id: 's2', startTime: 6, endTime: 11, text: 'Second sentence segment.' },
        { id: 's3', startTime: 12, endTime: 17, text: 'Third sentence segment.' },
      ],
    }

    it('advances exactly 1 segment when pressing Alt + ArrowRight even while focused on dictation textarea', () => {
      storage.saveVideos([multiSegmentLesson])
      storage.saveActiveLessonId(multiSegmentLesson.id)

      render(<App />)

      // Initial sentence: Sentence 1 of 3
      expect(screen.getByText(/Sentence 1 of 3/i)).toBeInTheDocument()

      const textarea = screen.getByPlaceholderText(/Type what you hear/i)
      textarea.focus()

      // Press Alt + ArrowRight while focused inside the textarea
      fireEvent.keyDown(textarea, { altKey: true, key: 'ArrowRight' })

      // MUST advance to Sentence 2 of 3, NOT jump to Sentence 3 of 3!
      expect(screen.getByText(/Sentence 2 of 3/i)).toBeInTheDocument()

      // Press Alt + ArrowRight again
      fireEvent.keyDown(textarea, { altKey: true, key: 'ArrowRight' })
      expect(screen.getByText(/Sentence 3 of 3/i)).toBeInTheDocument()

      // Press Alt + ArrowLeft
      fireEvent.keyDown(textarea, { altKey: true, key: 'ArrowLeft' })

      // MUST go back to Sentence 2 of 3, NOT jump to Sentence 1 of 3!
      expect(screen.getByText(/Sentence 2 of 3/i)).toBeInTheDocument()

      // Press Alt + ArrowLeft again
      fireEvent.keyDown(textarea, { altKey: true, key: 'ArrowLeft' })
      expect(screen.getByText(/Sentence 1 of 3/i)).toBeInTheDocument()
    })

    it('ignores key repeat when holding Alt + ArrowRight', () => {
      storage.saveVideos([multiSegmentLesson])
      storage.saveActiveLessonId(multiSegmentLesson.id)

      render(<App />)

      expect(screen.getByText(/Sentence 1 of 3/i)).toBeInTheDocument()

      const textarea = screen.getByPlaceholderText(/Type what you hear/i)

      // Key repeat event
      fireEvent.keyDown(textarea, { altKey: true, key: 'ArrowRight', repeat: true })

      // Still on Sentence 1 of 3 because repeat was ignored!
      expect(screen.getByText(/Sentence 1 of 3/i)).toBeInTheDocument()
    })
  })
})

