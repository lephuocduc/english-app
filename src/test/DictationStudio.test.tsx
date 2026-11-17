import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DictationStudio } from '../features/dictation/DictationStudio'
import { SAMPLE_LESSONS } from '../data/sampleLessons'

const mockSampleLesson = {
  id: 'lesson-commencement',
  title: 'Steve Jobs Stanford Commencement Address',
  videoId: 'UF8uR6Z6KLc',
  transcriptSource: 'YouTube Official',
  sentences: [
    {
      id: 'seg-1',
      startTime: 0,
      endTime: 10,
      text: 'I am honored to be with you today at your commencement from one of the finest universities in the world.',
    },
    {
      id: 'seg-2',
      startTime: 11,
      endTime: 20,
      text: 'Truth be told, I never graduated from college.',
    },
  ],
}

describe('DictationStudio Component', () => {
  const lesson = mockSampleLesson

  it('renders typing studio and handles answer submission', () => {
    const onSaveProgress = vi.fn()
    render(
      <DictationStudio
        lesson={lesson}
        activeSegmentIndex={0}
        isPlayerReady={true}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={onSaveProgress}
        savedProgressMap={{}}
      />
    )

    const input = screen.getByPlaceholderText(/Type what you hear/i)
    fireEvent.change(input, {
      target: {
        value:
          'I am honored to be with you today at your commencement from one of the finest universities in the world.',
      },
    })

    const checkBtn = screen.getByRole('button', { name: /Check Answer/i })
    expect(checkBtn).not.toBeDisabled()

    fireEvent.click(checkBtn)

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Correct: 20')).toBeInTheDocument()
    expect(screen.getByText(/Official Transcript:/i)).toBeInTheDocument()
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 100,
        completed: true,
        isRevealed: true,
      })
    )
  })

  it('handles partial answer submission and shows missing words', () => {
    const onSaveProgress = vi.fn()
    render(
      <DictationStudio
        lesson={lesson}
        activeSegmentIndex={0}
        isPlayerReady={true}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={onSaveProgress}
        savedProgressMap={{}}
      />
    )

    const input = screen.getByPlaceholderText(/Type what you hear/i)
    fireEvent.change(input, {
      target: {
        value: 'I am honored to be with you today',
      },
    })

    const checkBtn = screen.getByRole('button', { name: /Check Answer/i })
    fireEvent.click(checkBtn)

    expect(screen.getAllByText(/Word Similarity/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Missing: 12/)).toBeInTheDocument()
    expect(onSaveProgress).toHaveBeenCalled()
  })

  it('renders segment setup UI and invokes onAddSegment when video has no sentences', () => {
    const onAddSegment = vi.fn()
    const emptyLesson = { ...lesson, sentences: [] }
    render(
      <DictationStudio
        lesson={emptyLesson}
        activeSegmentIndex={0}
        isPlayerReady={true}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={vi.fn()}
        savedProgressMap={{}}
        onAddSegment={onAddSegment}
        getCurrentPlayerTime={() => 15}
      />
    )

    expect(screen.getByText(/YouTube Sentence Dictation/i)).toBeInTheDocument()
    const addBtn = screen.getByRole('button', { name: /Add Custom Segment/i })
    fireEvent.click(addBtn)

    const textInput = screen.getByPlaceholderText(/e\.g\. Today I want to tell you/i)
    fireEvent.change(textInput, { target: { value: 'Hello world' } })

    const saveBtn = screen.getByRole('button', { name: /Save Segment/i })
    fireEvent.click(saveBtn)

    expect(onAddSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello world',
      })
    )
  })

  it('resets user input to blank and clears previous score when activeSegmentIndex changes', () => {
    const { rerender } = render(
      <DictationStudio
        lesson={lesson}
        activeSegmentIndex={0}
        isPlayerReady={true}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={vi.fn()}
        savedProgressMap={{}}
      />
    )

    const input = screen.getByPlaceholderText(/Type what you hear/i) as HTMLTextAreaElement
    fireEvent.change(input, {
      target: { value: 'My answer for first sentence' },
    })
    expect(input.value).toBe('My answer for first sentence')

    // Switch to segment 1 (next sentence)
    rerender(
      <DictationStudio
        lesson={lesson}
        activeSegmentIndex={1}
        isPlayerReady={true}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={vi.fn()}
        savedProgressMap={{}}
      />
    )

    // The typing input must now be blank!
    expect(input.value).toBe('')
  })

  it('shows preceding incomplete words on Show Answer and Check Answer for split sentences, without counting them in score', () => {
    const splitLesson: Lesson = {
      id: 'split-lesson-1',
      title: 'Split Sentence Lesson',
      videoId: 'abc12345678',
      sentences: [
        {
          id: 's1',
          startTime: 0,
          endTime: 6,
          text: 'of fresh and new. So I am gonna start in just a second, but first of all, just one question for',
        },
        {
          id: 's2',
          startTime: 6,
          endTime: 10,
          text: 'you before we begin.',
        },
      ],
    }
    const onSaveProgress = vi.fn()

    render(
      <DictationStudio
        lesson={splitLesson}
        activeSegmentIndex={1}
        isPlayerReady={true}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={onSaveProgress}
        savedProgressMap={{}}
      />
    )

    // User only types the current segment words ("you before we begin.")
    const input = screen.getByPlaceholderText(/Type what you hear/i)
    fireEvent.change(input, { target: { value: 'you before we begin.' } })

    const checkBtn = screen.getByRole('button', { name: /Check Answer/i })
    fireEvent.click(checkBtn)

    // Score MUST be 100% (preceding words must NOT be scored!)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Correct: 4')).toBeInTheDocument()
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 100,
        completed: true,
        isRevealed: true,
      })
    )

    // Official Transcript displays BOTH the preceding incomplete clause AND current segment text
    const prefixEl = screen.getByTestId('split-sentence-prefix')
    expect(prefixEl).toHaveTextContent(
      'So I am gonna start in just a second, but first of all, just one question for'
    )
    expect(prefixEl.parentElement).toHaveTextContent(
      'So I am gonna start in just a second, but first of all, just one question for you before we begin.'
    )
  })
})
