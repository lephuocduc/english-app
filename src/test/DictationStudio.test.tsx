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
  const lesson = SAMPLE_LESSONS[0] || mockSampleLesson

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

    const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/)
    fireEvent.change(input, {
      target: {
        value:
          'I am honored to be with you today at your commencement from one of the finest universities in the world.',
      },
    })

    const checkBtn = screen.getByRole('button', { name: /Kiểm tra đáp án/i })
    expect(checkBtn).not.toBeDisabled()

    fireEvent.click(checkBtn)

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Đúng: 20')).toBeInTheDocument()
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 100,
        completed: true,
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

    const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/)
    fireEvent.change(input, {
      target: {
        value: 'I am honored to be with you today',
      },
    })

    const checkBtn = screen.getByRole('button', { name: /Kiểm tra đáp án/i })
    fireEvent.click(checkBtn)

    expect(screen.getByText(/Độ tương đồng từ/i)).toBeInTheDocument()
    expect(screen.getByText(/Sót: 12/)).toBeInTheDocument()
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

    expect(screen.getByText(/Luyện nghe theo phân đoạn câu YouTube/i)).toBeInTheDocument()
    const addBtn = screen.getByRole('button', { name: /Thêm phân đoạn câu/i })
    fireEvent.click(addBtn)

    const textInput = screen.getByPlaceholderText(/Ví dụ: Today I want to tell you/i)
    fireEvent.change(textInput, { target: { value: 'Hello world' } })

    const saveBtn = screen.getByRole('button', { name: /Lưu phân đoạn/i })
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

    const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/) as HTMLTextAreaElement
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
})
