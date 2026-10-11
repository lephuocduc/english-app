import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { VocabularyView } from '../features/vocabulary/VocabularyView'
import { FlashcardReviewModal } from '../features/vocabulary/FlashcardReviewModal'
import { AddVocabularyModal } from '../features/vocabulary/AddVocabularyModal'
import type { VocabularyItem } from '../types'

const mockVocabList: VocabularyItem[] = [
  {
    id: 'v1',
    word: 'resilient',
    meaning: 'kiên cường, có khả năng phục hồi',
    contextSentence: 'They are resilient in the face of difficulties.',
    contextSentenceTranslation: 'Họ rất kiên cường trước những khó khăn.',
    timestamp: 45,
    videoId: 'abc123',
    lessonTitle: 'Steve Jobs Speech',
    savedAt: '2026-10-01T00:00:00Z',
    mastered: false,
    interval: 0,
    repetitions: 0,
  },
  {
    id: 'v2',
    word: 'curiosity',
    meaning: 'sự tò mò, hiếu kỳ',
    contextSentence: 'Curiosity led him to discover new things.',
    contextSentenceTranslation: 'Sự tò mò đã đưa anh ấy đến việc khám phá những điều mới mẻ.',
    timestamp: 90,
    videoId: 'abc123',
    lessonTitle: 'Steve Jobs Speech',
    savedAt: '2026-10-02T00:00:00Z',
    mastered: true,
    interval: 30,
    repetitions: 4,
    dueDate: '2026-11-01',
    lastReviewedAt: '2026-10-02T00:00:00Z',
  },
]

describe('VocabularyView & Flashcard Anki SRS Integration Tests', () => {
  it('renders SRS statistics bar with total, due, and mastered counts', () => {
    render(
      <VocabularyView
        vocabularyList={mockVocabList}
        onRemoveVocabulary={vi.fn()}
      />
    )

    expect(screen.getByText('Tổng số từ')).toBeInTheDocument()
    expect(screen.getByText('Cần ôn hôm nay')).toBeInTheDocument()
    expect(screen.queryByText('Đang học')).not.toBeInTheDocument()
    expect(screen.getAllByText('Đã thuộc')[0]).toBeInTheDocument()

    // Button Ôn Flashcard (x) strictly displays count of words due today (1 word due)
    expect(screen.getByRole('button', { name: /Ôn Flashcard \(1\)/i })).toBeInTheDocument()

    // Words displayed
    expect(screen.getByText('resilient')).toBeInTheDocument()
    expect(screen.getByText('curiosity')).toBeInTheDocument()
  })

  it('displays Ôn Flashcard (0) when all words are mastered or not due yet', () => {
    const allMastered = mockVocabList.map((item) => ({ ...item, mastered: true }))
    render(
      <VocabularyView
        vocabularyList={allMastered}
        onRemoveVocabulary={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /Ôn Flashcard \(0\)/i })).toBeInTheDocument()
  })

  it('filters vocabulary cards by tab (All, Due, Mastered)', () => {
    render(
      <VocabularyView
        vocabularyList={mockVocabList}
        onRemoveVocabulary={vi.fn()}
      />
    )

    // Initially both words visible under All
    expect(screen.getByText('resilient')).toBeInTheDocument()
    expect(screen.getByText('curiosity')).toBeInTheDocument()

    // Filter by Mastered tab
    const masteredTab = screen.getByRole('button', { name: /Đã thuộc/i })
    fireEvent.click(masteredTab)

    expect(screen.getByText('curiosity')).toBeInTheDocument()
    expect(screen.queryByText('resilient')).not.toBeInTheDocument()

    // Filter by Due tab
    const dueTab = screen.getByRole('button', { name: /Cần ôn/i })
    fireEvent.click(dueTab)

    expect(screen.getByText('resilient')).toBeInTheDocument()
    expect(screen.queryByText('curiosity')).not.toBeInTheDocument()

    // Learning tab is removed
    expect(screen.queryByRole('button', { name: /Đang học/i })).not.toBeInTheDocument()
  })

  it('does not display manual toggle mastered button on cards (mastery managed via SM-2 review)', () => {
    const onUpdateVocabulary = vi.fn()
    render(
      <VocabularyView
        vocabularyList={mockVocabList}
        onRemoveVocabulary={vi.fn()}
        onUpdateVocabulary={onUpdateVocabulary}
      />
    )

    expect(screen.queryByTitle('Đánh dấu đã thuộc từ này')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Bỏ đánh dấu đã thuộc')).not.toBeInTheDocument()
  })

  it('searches and filters words by query string', () => {
    render(
      <VocabularyView
        vocabularyList={mockVocabList}
        onRemoveVocabulary={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Tìm theo từ, nghĩa hoặc ví dụ/i)
    fireEvent.change(searchInput, { target: { value: 'kiên cường' } })

    expect(screen.getByText('resilient')).toBeInTheDocument()
    expect(screen.queryByText('curiosity')).not.toBeInTheDocument()
  })
})

describe('FlashcardReviewModal Component', () => {
  it('renders front side of card, flips on click, and provides SM-2 rating buttons', () => {
    const onUpdateVocabulary = vi.fn()
    const onClose = vi.fn()

    render(
      <FlashcardReviewModal
        isOpen={true}
        onClose={onClose}
        itemsToReview={mockVocabList}
        onUpdateVocabulary={onUpdateVocabulary}
      />
    )

    // Modal title
    expect(screen.getByText(/Ôn tập Flashcard/i)).toBeInTheDocument()
    // Front side shows English word
    expect(screen.getByText('resilient')).toBeInTheDocument()

    // Meaning not shown before flip
    expect(screen.queryByText('kiên cường, có khả năng phục hồi')).not.toBeInTheDocument()

    // Flip card button
    const flipBtn = screen.getByRole('button', { name: /Lật thẻ xem đáp án/i })
    fireEvent.click(flipBtn)

    // Back side shows Vietnamese meaning
    expect(screen.getByText('kiên cường, có khả năng phục hồi')).toBeInTheDocument()

    // Anki SM-2 buttons available
    const againBtn = screen.getByText(/1\. Quên \(Again\)/i)
    const hardBtn = screen.getByText(/2\. Khó \(Hard\)/i)
    const goodBtn = screen.getByText(/3\. Nhớ \(Good\)/i)
    const easyBtn = screen.getByText(/4\. Dễ \(Easy\)/i)

    expect(againBtn).toBeInTheDocument()
    expect(hardBtn).toBeInTheDocument()
    expect(goodBtn).toBeInTheDocument()
    expect(easyBtn).toBeInTheDocument()

    // Click Good rating
    fireEvent.click(goodBtn)

    expect(onUpdateVocabulary).toHaveBeenCalledTimes(1)
    const updated = onUpdateVocabulary.mock.calls[0][0] as VocabularyItem
    expect(updated.word).toBe('resilient')
    expect(updated.repetitions).toBe(1)
    expect(updated.interval).toBe(1)

    // Advances to second card
    expect(screen.getByText('curiosity')).toBeInTheDocument()
  })

  it('completes session after last card and presents completion summary screen', () => {
    const onUpdateVocabulary = vi.fn()
    const onClose = vi.fn()

    render(
      <FlashcardReviewModal
        isOpen={true}
        onClose={onClose}
        itemsToReview={[mockVocabList[0]]}
        onUpdateVocabulary={onUpdateVocabulary}
      />
    )

    // Flip card
    fireEvent.click(screen.getByRole('button', { name: /Lật thẻ xem đáp án/i }))

    // Rate Good
    fireEvent.click(screen.getByText(/3\. Nhớ \(Good\)/i))

    // Completion screen shows celebration message
    expect(
      screen.getByText(/Hoàn thành phiên ôn tập hôm nay!/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Quay về sổ từ vựng/i)).toBeInTheDocument()

    // Exit
    fireEvent.click(screen.getByText(/Quay về sổ từ vựng/i))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('AddVocabularyModal Component', () => {
  it('allows entering custom word, meaning, example sentence and submits', () => {
    const onAddVocabulary = vi.fn()
    const onClose = vi.fn()

    render(
      <AddVocabularyModal
        isOpen={true}
        onClose={onClose}
        onAddVocabulary={onAddVocabulary}
      />
    )

    expect(screen.getByText('Thêm từ vựng mới vào sổ tay')).toBeInTheDocument()

    const wordInput = screen.getByPlaceholderText(/Ví dụ: determine, breakthrough/i)
    const meaningInput = screen.getByPlaceholderText(/Ví dụ: xác định, đột phá/i)

    fireEvent.change(wordInput, { target: { value: 'innovation' } })
    fireEvent.change(meaningInput, { target: { value: 'sự đổi mới sáng tạo' } })

    const submitBtn = screen.getByRole('button', { name: /Lưu từ vựng/i })
    fireEvent.click(submitBtn)

    expect(onAddVocabulary).toHaveBeenCalledTimes(1)
    const submitted = onAddVocabulary.mock.calls[0][0] as VocabularyItem
    expect(submitted.word).toBe('innovation')
    expect(submitted.meaning).toBe('sự đổi mới sáng tạo')
    expect(onClose).toHaveBeenCalled()
  })
})
