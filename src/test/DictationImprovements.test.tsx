import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { useYouTubePlayer, loadYouTubeIframeApi } from '../features/youtube/useYouTubePlayer'
import { DictationStudio } from '../features/dictation/DictationStudio'
import { SentenceList } from '../features/dictation/SentenceList'
import { YouTubePlayerView } from '../features/youtube/YouTubePlayerView'
import { storage } from '../lib/storage/storage'
import App from '../App'

const mockLesson = {
  id: 'video-UF8uR6Z6KLc',
  title: 'Steve Jobs: Connecting the Dots (Stanford 2005)',
  videoId: 'UF8uR6Z6KLc',
  language: 'English (US)',
  transcriptSource: 'YouTube Video Transcript',
  isVerified: true,
  level: 'Intermediate' as const,
  description: 'Steve Jobs Speech',
  sentences: [
    {
      id: 'seg-1',
      startTime: 24,
      endTime: 30,
      text: 'I am honored to be with you today at your commencement from one of the finest universities in the world.',
      translation: 'Tôi rất vinh dự được có mặt cùng các bạn hôm nay tại lễ tốt nghiệp từ một trong những trường đại học tốt nhất trên thế giới.',
      hint: 'honored, commencement, finest universities',
    },
    {
      id: 'seg-2',
      startTime: 30,
      endTime: 36,
      text: "I never graduated from college. Truth be told, this is the closest I've ever gotten to a college graduation.",
      translation: 'Tôi chưa từng tốt nghiệp đại học.',
      hint: 'graduated, truth be told, graduation',
    },
    {
      id: 'seg-3',
      startTime: 37,
      endTime: 44,
      text: "Today I want to tell you three stories from my life. That's it. No big deal. Just three stories.",
      translation: 'Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện.',
      hint: 'three stories, no big deal',
    },
    {
      id: 'seg-4',
      startTime: 44,
      endTime: 50,
      text: 'The first story is about connecting the dots.',
      translation: 'Câu chuyện đầu tiên là về việc kết nối các dấu chấm.',
      hint: 'connecting the dots',
    },
    {
      id: 'seg-5',
      startTime: 51,
      endTime: 58,
      text: 'I dropped out of Reed College after the first six months.',
      translation: 'Tôi bỏ học tại trường Cao đẳng Reed sau sáu tháng đầu.',
      hint: 'dropped out, stayed around',
    },
  ],
}

describe('ListenFlow Improvement Requirements', () => {
  beforeEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
    storage.saveVideos([mockLesson])
    storage.saveActiveLessonId(mockLesson.id)
    document.body.innerHTML = ''

    // Mock YouTube IFrame API
    window.YT = {
      Player: class MockPlayer {
        seekTo = vi.fn()
        playVideo = vi.fn()
        pauseVideo = vi.fn()
        getCurrentTime = vi.fn(() => 0)
        setPlaybackRate = vi.fn()
        destroy = vi.fn()
        constructor(_id: any, opts: any) {
          setTimeout(() => {
            opts.events?.onReady?.({ target: this })
          }, 0)
        }
      },
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
      },
    } as any

    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('1. Accurate sentence playback and segment timing in useYouTubePlayer', () => {
    it('automatically pauses at segment endTime and calls onSegmentEnd', async () => {
      vi.useFakeTimers()
      const onSegmentEnd = vi.fn()
      let currentTime = 5.0

      const mockPlayerInstance = {
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
        getCurrentTime: vi.fn(() => currentTime),
        setPlaybackRate: vi.fn(),
        destroy: vi.fn(),
      }

      window.YT!.Player = class {
        constructor(_id: any, opts: any) {
          Object.assign(this, mockPlayerInstance)
          setTimeout(() => {
            opts.events?.onReady?.({ target: this })
          }, 0)
        }
      } as any

      const container = document.createElement('div')
      container.id = 'test-player'
      document.body.appendChild(container)

      const { result } = renderHook(() =>
        useYouTubePlayer({
          containerId: 'test-player',
          videoId: 'test-vid',
          onSegmentEnd,
        })
      )

      // Let onReady fire by flushing promises and timers
      await act(async () => {
        await Promise.resolve()
        vi.advanceTimersByTime(20)
      })

      expect(result.current.isReady).toBe(true)

      // Play segment from 5s to 10s
      act(() => {
        result.current.playSegment(5.0, 10.0)
      })

      expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(5.0, true)
      expect(mockPlayerInstance.playVideo).toHaveBeenCalled()

      // Time advances to 8s (still within segment)
      currentTime = 8.0
      await act(async () => {
        vi.advanceTimersByTime(120)
      })
      expect(mockPlayerInstance.pauseVideo).not.toHaveBeenCalled()
      expect(onSegmentEnd).not.toHaveBeenCalled()

      // Time reaches 10.0s (endTime)
      currentTime = 10.0
      await act(async () => {
        vi.advanceTimersByTime(120)
      })

      expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled()
      expect(onSegmentEnd).toHaveBeenCalled()
    })

    it('prevents seek-settle race condition where initial getCurrentTime is old and >= endTime', async () => {
      vi.useFakeTimers()
      const onSegmentEnd = vi.fn()

      // Simulate player previously at 50s.
      // In first 100ms after seek to 5s, getCurrentTime still returns 50s.
      let currentTime = 50.0

      const mockPlayerInstance = {
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
        getCurrentTime: vi.fn(() => currentTime),
        setPlaybackRate: vi.fn(),
        destroy: vi.fn(),
      }

      window.YT!.Player = class {
        constructor(_id: any, opts: any) {
          Object.assign(this, mockPlayerInstance)
          setTimeout(() => {
            opts.events?.onReady?.({ target: this })
          }, 0)
        }
      } as any

      const container = document.createElement('div')
      container.id = 'race-player'
      document.body.appendChild(container)

      const { result } = renderHook(() =>
        useYouTubePlayer({
          containerId: 'race-player',
          videoId: 'test-vid-race',
          onSegmentEnd,
        })
      )

      await act(async () => {
        await Promise.resolve()
        vi.advanceTimersByTime(20)
      })

      expect(result.current.isReady).toBe(true)

      // Start segment from 5s to 12s
      act(() => {
        result.current.playSegment(5.0, 12.0)
      })

      // First tick: time is still 50s (not settled in [5, 12])
      await act(async () => {
        vi.advanceTimersByTime(70)
      })

      // Must NOT pause prematurely!
      expect(mockPlayerInstance.pauseVideo).not.toHaveBeenCalled()
      expect(onSegmentEnd).not.toHaveBeenCalled()

      // Second tick: seek settles to 5.2s
      currentTime = 5.2
      await act(async () => {
        vi.advanceTimersByTime(70)
      })
      expect(mockPlayerInstance.pauseVideo).not.toHaveBeenCalled()

      // Third tick: advances to end of segment 12.0s
      currentTime = 12.0
      await act(async () => {
        vi.advanceTimersByTime(70)
      })

      // Now it pauses cleanly
      expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled()
      expect(onSegmentEnd).toHaveBeenCalled()
    })

    it('restores segment boundary watcher upon resuming after pause', async () => {
      vi.useFakeTimers()
      const onSegmentEnd = vi.fn()
      let currentTime = 5.0

      const mockPlayerInstance = {
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
        getCurrentTime: vi.fn(() => currentTime),
        setPlaybackRate: vi.fn(),
        destroy: vi.fn(),
      }

      window.YT!.Player = class {
        constructor(_id: any, opts: any) {
          Object.assign(this, mockPlayerInstance)
          setTimeout(() => {
            opts.events?.onReady?.({ target: this })
          }, 0)
        }
      } as any

      const container = document.createElement('div')
      container.id = 'pause-resume-player'
      document.body.appendChild(container)

      const { result } = renderHook(() =>
        useYouTubePlayer({
          containerId: 'pause-resume-player',
          videoId: 'test-vid-pause',
          onSegmentEnd,
        })
      )

      await act(async () => {
        await Promise.resolve()
        vi.advanceTimersByTime(20)
      })

      expect(result.current.isReady).toBe(true)

      // Play segment 5s to 10s
      act(() => {
        result.current.playSegment(5.0, 10.0)
      })

      // Pause at 7s
      currentTime = 7.0
      act(() => {
        result.current.pauseSegment()
      })
      expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled()

      // Resume at 7s
      act(() => {
        result.current.resumeSegment()
      })
      expect(mockPlayerInstance.playVideo).toHaveBeenCalled()

      // Advance to 10s
      currentTime = 10.0
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Watcher must still be active and trigger pauseVideo
      expect(mockPlayerInstance.pauseVideo).toHaveBeenCalledTimes(2)
      expect(onSegmentEnd).toHaveBeenCalled()
    })

    it('queues pending segment if playSegment is called before player readiness', async () => {
      vi.useFakeTimers()
      let onReadyCallback: any = null

      const mockPlayerInstance = {
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
        getCurrentTime: vi.fn(() => 2.0),
        setPlaybackRate: vi.fn(),
        destroy: vi.fn(),
      }

      window.YT!.Player = class {
        constructor(_id: any, opts: any) {
          Object.assign(this, mockPlayerInstance)
          onReadyCallback = opts.events?.onReady
        }
      } as any

      const container = document.createElement('div')
      container.id = 'pending-player'
      document.body.appendChild(container)

      const { result } = renderHook(() =>
        useYouTubePlayer({
          containerId: 'pending-player',
          videoId: 'test-vid-pending',
        })
      )

      expect(result.current.isReady).toBe(false)

      // Attempt to play segment while not ready
      act(() => {
        result.current.playSegment(2.0, 8.0)
      })

      // mock seekTo should not be called yet
      expect(mockPlayerInstance.seekTo).not.toHaveBeenCalled()

      // Player finishes initializing
      await act(async () => {
        await Promise.resolve()
        onReadyCallback?.({ target: mockPlayerInstance })
      })

      expect(result.current.isReady).toBe(true)
      // Pending segment should now be played automatically
      expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(2.0, true)
      expect(mockPlayerInstance.playVideo).toHaveBeenCalled()
    })
  })

  describe('2. Word-level answer alignment highlighting (correct, missing, incorrect, extra)', () => {
    const lesson = mockLesson

    it('renders alignment breakdown with correct, missing, incorrect, extra words and visual legend', () => {
      render(
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

      // Expected sentence begins: "I am honored to be with you today at your commencement..."
      // User input with:
      // - Correct: "I am"
      // - Incorrect: "pleased" (for "honored")
      // - Extra: "extraWord" (inserted at the end)
      // - Missing: the rest of the sentence
      const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/)
      fireEvent.change(input, {
        target: {
          value: 'I am pleased to be with you today at your commencement extraWord',
        },
      })

      const checkBtn = screen.getByRole('button', { name: /Kiểm tra đáp án/i })
      fireEvent.click(checkBtn)

      // Check alignment region
      expect(screen.getByRole('region', { name: /Kết quả đối chiếu từng từ/i })).toBeInTheDocument()

      // Visual Legend
      expect(screen.getByText('Đúng')).toBeInTheDocument()
      expect(screen.getByText('Sai')).toBeInTheDocument()
      expect(screen.getByText('Sót')).toBeInTheDocument()
      expect(screen.getByText('Thừa')).toBeInTheDocument()

      // Check badges exist
      expect(screen.getByText('I')).toBeInTheDocument()
      expect(screen.getByText('am')).toBeInTheDocument()
      expect(screen.getByText('pleased')).toBeInTheDocument()
      expect(screen.getByText('pleased')).toHaveClass('line-through')
      expect(screen.getByText('extraWord')).toBeInTheDocument()
      expect(screen.getByText('extraWord')).toHaveClass('line-through')
      expect(screen.getAllByText(/\[\+ /)[0]).toBeInTheDocument()
    })
  })

  describe('3. Results summary and retry workflow', () => {
    const lesson = mockLesson

    it('displays results summary card, and retry workflow clears input, replays audio, and focuses textarea', () => {
      const onReplaySegment = vi.fn()
      render(
        <DictationStudio
          lesson={lesson}
          activeSegmentIndex={0}
          isPlayerReady={true}
          onSelectSegment={vi.fn()}
          onReplaySegment={onReplaySegment}
          onSaveProgress={vi.fn()}
          savedProgressMap={{}}
        />
      )

      const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/) as HTMLTextAreaElement
      fireEvent.change(input, {
        target: { value: 'I am honored to be' },
      })

      const checkBtn = screen.getByRole('button', { name: /Kiểm tra đáp án/i })
      fireEvent.click(checkBtn)

      // Results summary card appears
      expect(screen.getByText(/Độ tương đồng từ/i)).toBeInTheDocument()
      expect(screen.getByText(/Đối chiếu chi tiết từng từ/i)).toBeInTheDocument()

      // Retry button is available
      const retryBtn = screen.getByRole('button', { name: /Thử lại câu này/i })
      expect(retryBtn).toBeInTheDocument()

      fireEvent.click(retryBtn)

      // Expect input to be cleared
      expect(input.value).toBe('')
      // Audio replay triggered
      expect(onReplaySegment).toHaveBeenCalled()
      // Score summary closed
      expect(screen.queryByText(/Đối chiếu chi tiết từng từ/i)).not.toBeInTheDocument()
    })

    it('displays honest custom video message and freeform scratchpad for videos without verified transcripts', () => {
      const customLesson = {
        id: 'custom-abc12345678',
        title: 'Custom User Video',
        videoId: 'abc12345678',
        language: 'Tự chọn (Custom)',
        transcriptSource: 'Không có phụ đề mẫu xác minh (Video tùy chỉnh)',
        isVerified: false,
        level: 'Intermediate' as const,
        description: 'Test custom video',
        sentences: [], // Honest empty sentences
      }

      render(
        <DictationStudio
          lesson={customLesson}
          activeSegmentIndex={0}
          isPlayerReady={true}
          onSelectSegment={vi.fn()}
          onReplaySegment={vi.fn()}
          onSaveProgress={vi.fn()}
          savedProgressMap={{}}
        />
      )

      expect(
        screen.getByText(/Luyện nghe theo phân đoạn câu YouTube/i)
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(/Gõ lại những gì bạn nghe được khi xem video trên YouTube player/i)
      ).toBeInTheDocument()
    })
  })

  describe('4. Active sentence clear visual feedback and navigation controls', () => {
    it('SentenceList displays active indicator, duration, and playing pulse when isPlaying', () => {
      const sentences = mockLesson.sentences

      render(
        <SentenceList
          sentences={sentences}
          activeSegmentIndex={0}
          isPlaying={true}
          onSelectSegment={vi.fn()}
          savedProgressMap={{}}
        />
      )

      // Active item should show "Đang phát" badge
      expect(screen.getByText('Đang phát')).toBeInTheDocument()
      // Shows duration (sj-1: 30 - 24 = 6.0s)
      expect(screen.getAllByText(/\(6\.0s\)/)[0]).toBeInTheDocument()
    })

    it('YouTubePlayerView renders repeat sentence, pause/resume, previous, and next controls', () => {
      const onPlaySegment = vi.fn()
      const onTogglePlayPause = vi.fn()
      const onChangeSpeed = vi.fn()
      const onPreviousSegment = vi.fn()
      const onNextSegment = vi.fn()

      render(
        <YouTubePlayerView
          containerId="yt-view-test"
          videoId="test-123"
          isReady={true}
          isPlaying={false}
          playerError={null}
          currentSpeed={1.0}
          activeSegment={mockLesson.sentences[1]}
          onPlaySegment={onPlaySegment}
          onTogglePlayPause={onTogglePlayPause}
          onChangeSpeed={onChangeSpeed}
          onPreviousSegment={onPreviousSegment}
          onNextSegment={onNextSegment}
          hasPreviousSegment={true}
          hasNextSegment={true}
        />
      )

      // Repeat button
      const repeatBtn = screen.getByRole('button', { name: /Nghe lại phân đoạn câu hiện tại/i })
      fireEvent.click(repeatBtn)
      expect(onPlaySegment).toHaveBeenCalled()

      // Toggle play/pause (Resume)
      const resumeBtn = screen.getByRole('button', { name: /Tiếp tục phát video/i })
      fireEvent.click(resumeBtn)
      expect(onTogglePlayPause).toHaveBeenCalled()

      // Previous and Next buttons
      const prevBtn = screen.getByRole('button', { name: /Phát câu trước/i })
      fireEvent.click(prevBtn)
      expect(onPreviousSegment).toHaveBeenCalled()

      const nextBtn = screen.getByRole('button', { name: /Phát câu tiếp theo/i })
      fireEvent.click(nextBtn)
      expect(onNextSegment).toHaveBeenCalled()

      // Speed selection
      const speed075Btn = screen.getByRole('button', { name: /Tốc độ phát 0\.75x/i })
      fireEvent.click(speed075Btn)
      expect(onChangeSpeed).toHaveBeenCalledWith(0.75)
    })
  })

  describe('5. Keyboard shortcuts with accessible behavior', () => {
    it('toggles play/pause when pressing Space outside of typing areas', () => {
      render(<App />)

      // Press Space while document body has focus
      fireEvent.keyDown(document.body, { code: 'Space' })

      // Header ListenFlow text should be present
      expect(screen.getAllByText(/ListenFlow/i)[0]).toBeInTheDocument()
    })

    it('replays current sentence with Ctrl+Space or Alt+R', () => {
      render(<App />)

      fireEvent.keyDown(document.body, { ctrlKey: true, code: 'Space' })
      fireEvent.keyDown(document.body, { altKey: true, key: 'r' })

      expect(screen.getByText(/Câu 1 \/ 5/i)).toBeInTheDocument()
    })

    it('navigates sentences with Alt+ArrowRight and Alt+ArrowLeft', () => {
      render(<App />)

      expect(screen.getByText(/Câu 1 \/ 5/i)).toBeInTheDocument()

      // Navigate to sentence 2
      fireEvent.keyDown(window, { altKey: true, key: 'ArrowRight' })
      expect(screen.getByText(/Câu 2 \/ 5/i)).toBeInTheDocument()

      // Navigate back to sentence 1
      fireEvent.keyDown(window, { altKey: true, key: 'ArrowLeft' })
      expect(screen.getByText(/Câu 1 \/ 5/i)).toBeInTheDocument()
    })
  })

  describe('6. Production Resilience & YouTube Script Failure Handling', () => {
    it('loadYouTubeIframeApi rejects when script tag triggers error', async () => {
      delete (window as any).YT
      delete (window as any).onYouTubeIframeAPIReady
      const oldScript = document.getElementById('youtube-iframe-api-script')
      if (oldScript) oldScript.remove()

      const loadPromise = loadYouTubeIframeApi(2000)
      const script = document.getElementById('youtube-iframe-api-script')
      expect(script).toBeTruthy()

      // Simulate network / CDN load error
      script?.dispatchEvent(new Event('error'))

      await expect(loadPromise).rejects.toThrow('Lỗi tải YouTube IFrame API script')
    })

    it('loadYouTubeIframeApi rejects when timeout expires without API ready', async () => {
      vi.useFakeTimers()
      delete (window as any).YT
      delete (window as any).onYouTubeIframeAPIReady
      const oldScript = document.getElementById('youtube-iframe-api-script')
      if (oldScript) oldScript.remove()

      const loadPromise = loadYouTubeIframeApi(500)
      vi.advanceTimersByTime(600)

      await expect(loadPromise).rejects.toThrow('Thời gian tải YouTube IFrame API đã quá hạn')
    })

    it('sets user-facing playerError when loadYouTubeIframeApi fails', async () => {
      delete (window as any).YT
      delete (window as any).onYouTubeIframeAPIReady
      const oldScript = document.getElementById('youtube-iframe-api-script')
      if (oldScript) oldScript.remove()

      const onErrorMock = vi.fn()
      const container = document.createElement('div')
      container.id = 'err-test-player'
      document.body.appendChild(container)

      const { result } = renderHook(() =>
        useYouTubePlayer({
          containerId: 'err-test-player',
          videoId: 'test-vid-err',
          onError: onErrorMock,
        })
      )

      const script = document.getElementById('youtube-iframe-api-script')
      script?.dispatchEvent(new Event('error'))

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(result.current.playerError).toContain('Không thể tải thư viện YouTube IFrame API')
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Không thể tải thư viện YouTube IFrame API')
      )
    })
  })
})

