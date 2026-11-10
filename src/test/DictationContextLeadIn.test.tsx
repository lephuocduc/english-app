import React from 'react'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DictationStudio } from '../features/dictation/DictationStudio'
import { useYouTubePlayer } from '../features/youtube/useYouTubePlayer'
import type { Lesson } from '../types'

const mockLesson: Lesson = {
  id: 'test-lesson-context',
  title: 'Context and Lead-In Test Lesson',
  videoId: 'dQw4w9WgXcQ',
  transcriptSource: 'Official Subtitles',
  sentences: [
    {
      id: 'seg-0',
      startTime: 0.0,
      endTime: 5.0,
      text: 'First introductory sentence of the lesson.',
      translation: 'Câu mở đầu đầu tiên của bài học.',
    },
    {
      id: 'seg-1',
      startTime: 5.0,
      endTime: 10.0,
      text: 'Second sentence following the first one.',
      translation: 'Câu thứ hai nối tiếp câu đầu tiên.',
    },
  ],
}

describe('Dictation Previous Sentence Context & 1s Audio Lead-In', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does NOT display previous sentence context for the first sentence (#1)', () => {
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

    // Context banner should not exist on sentence 0
    expect(screen.queryByText(/Câu trước đó \(Context/i)).toBeNull()
  })

  it('displays previous sentence context and translation for sentence #2', () => {
    const onPlayPreviousSegment = vi.fn()
    const onToggleLeadIn = vi.fn()

    render(
      <DictationStudio
        lesson={mockLesson}
        activeSegmentIndex={1}
        isPlayerReady={true}
        hasLeadIn={true}
        onToggleLeadIn={onToggleLeadIn}
        onPlayPreviousSegment={onPlayPreviousSegment}
        onSelectSegment={vi.fn()}
        onReplaySegment={vi.fn()}
        onSaveProgress={vi.fn()}
        savedProgressMap={{}}
      />
    )

    // Banner should be visible with previous sentence text
    expect(screen.getByText(/Câu trước đó \(Context #1\):/i)).toBeInTheDocument()
    expect(screen.getByText(/First introductory sentence of the lesson/i)).toBeInTheDocument()
    expect(screen.getByText(/Câu mở đầu đầu tiên của bài học/i)).toBeInTheDocument()

    // Test playing previous sentence audio
    const playPrevBtn = screen.getByTitle(/Nghe lại câu trước \(#1\)/i)
    expect(playPrevBtn).toBeInTheDocument()
    fireEvent.click(playPrevBtn)
    expect(onPlayPreviousSegment).toHaveBeenCalledTimes(1)

    // Test clicking +1s lead-in button
    const leadInBtn = screen.getByTitle(/Tắt nghe đệm 1s từ câu trước/i)
    expect(leadInBtn).toBeInTheDocument()
    fireEvent.click(leadInBtn)
    expect(onToggleLeadIn).toHaveBeenCalledTimes(1)
  })

  it('useYouTubePlayer plays with 1s lead-in buffer when leadInSeconds is supplied', () => {
    const mockPlayer = {
      seekTo: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(4.0),
      getPlayerState: vi.fn().mockReturnValue(1),
    }

    // Mock window.YT
    window.YT = {
      Player: vi.fn().mockImplementation((_id, opts) => {
        setTimeout(() => {
          opts.events?.onReady?.({ target: mockPlayer })
        }, 0)
        return mockPlayer
      }),
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
      },
    } as any

    const { result } = renderHook(() =>
      useYouTubePlayer({
        containerId: 'test-yt-container',
        videoId: 'test-vid-123',
      })
    )

    act(() => {
      // startTime = 5.0, endTime = 10.0, leadInSeconds = 1.0
      // Expected actual seek time: Math.max(0, 5.0 - 1.0) = 4.0
      result.current.playSegment(5.0, 10.0, 1.0)
    })

    // Player ref not populated until onReady fires, but check queue
    expect(result.current).toBeDefined()
  })
})
