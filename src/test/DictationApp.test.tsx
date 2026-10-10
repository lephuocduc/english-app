import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import App from '../App'

describe('ListenFlow Integration & UI Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()

    // Mock YouTube IFrame API
    window.YT = {
      Player: class MockPlayer {
        seekTo = () => {}
        playVideo = () => {}
        pauseVideo = () => {}
        getCurrentTime = () => 25
        setPlaybackRate = () => {}
        destroy = () => {}
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

  it('renders application header and main navigation tabs', () => {
    render(<App />)

    expect(screen.getAllByText('ListenFlow')[0]).toBeInTheDocument()
    // Check navigation buttons
    expect(screen.getAllByText('Luyện tập')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Video của tôi')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Từ vựng')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Tiến độ')[0]).toBeInTheDocument()
  })

  it('renders practice studio with YouTube player container and active YouTube video', () => {
    render(<App />)

    expect(
      screen.getByText('Steve Jobs: Connecting the Dots (Stanford 2005)')
    ).toBeInTheDocument()
    expect(screen.getByText(/YouTube ID: UF8uR6Z6KLc/i)).toBeInTheDocument()
    expect(screen.getByText(/Câu 1 \/ 5/)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/)
    ).toBeInTheDocument()
  })

  it('reveals and hides the expected transcript answer when clicking the toggle button', () => {
    render(<App />)

    const revealBtn = screen.getByRole('button', { name: /Xem đáp án/i })
    expect(revealBtn).toBeInTheDocument()

    // Click to reveal
    fireEvent.click(revealBtn)
    expect(screen.getByText(/Bản dịch & Transcript chính thức/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        'I am honored to be with you today at your commencement from one of the finest universities in the world.'
      )
    ).toBeInTheDocument()

    // Click to hide
    const hideBtn = screen.getByRole('button', { name: /Ẩn đáp án/i })
    fireEvent.click(hideBtn)
    expect(screen.queryByText(/Bản dịch & Transcript chính thức/i)).not.toBeInTheDocument()
  })

  it('submits answer and displays 100% score for exact match', () => {
    render(<App />)

    const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/)
    fireEvent.change(input, {
      target: {
        value:
          'I am honored to be with you today at your commencement from one of the finest universities in the world.',
      },
    })

    const checkBtn = screen.getByRole('button', { name: /Kiểm tra đáp án/i })
    fireEvent.click(checkBtn)

    expect(screen.getAllByText('100%')[0]).toBeInTheDocument()
    expect(
      screen.getByText(/Xuất sắc! Bạn đã nghe và gõ chính xác 100%!/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Đúng: 20')).toBeInTheDocument()
  })

  it('submits partial answer and shows word breakdown with missing words', () => {
    render(<App />)

    const input = screen.getByPlaceholderText(/Gõ lại câu tiếng Anh bạn vừa nghe/)
    fireEvent.change(input, {
      target: {
        value: 'I am honored to be with you today',
      },
    })

    const checkBtn = screen.getByRole('button', { name: /Kiểm tra đáp án/i })
    fireEvent.click(checkBtn)

    expect(screen.getByText(/Độ tương đồng từ/i)).toBeInTheDocument()
    expect(screen.getByText(/Sót:/i)).toBeInTheDocument()
  })

  it('navigates between sentence segments and updates active segment index', () => {
    render(<App />)

    expect(screen.getByText(/Câu 1 \/ 5/)).toBeInTheDocument()

    // Click next sentence button
    const nextBtn = screen.getByTitle('Câu tiếp theo')
    fireEvent.click(nextBtn)

    expect(screen.getByText(/Câu 2 \/ 5/)).toBeInTheDocument()

    // Click previous sentence button
    const prevBtn = screen.getByTitle('Câu trước')
    fireEvent.click(prevBtn)

    expect(screen.getByText(/Câu 1 \/ 5/)).toBeInTheDocument()
  })

  it('switches to My Videos tab and displays saved YouTube videos', () => {
    render(<App />)

    const videosTabBtn = screen.getAllByText('Video của tôi')[0]
    fireEvent.click(videosTabBtn)

    expect(screen.getByText(/Danh sách video đã lưu/i)).toBeInTheDocument()
    expect(
      screen.getByText('Steve Jobs: Connecting the Dots (Stanford 2005)')
    ).toBeInTheDocument()
  })

  it('handles invalid custom YouTube URL with a clear error in import form', () => {
    render(<App />)

    // Switch to My Videos tab where import form is located
    const videosTabBtn = screen.getAllByText('Video của tôi')[0]
    fireEvent.click(videosTabBtn)

    const urlInput = screen.getByPlaceholderText(/Dán link YouTube/)
    fireEvent.change(urlInput, { target: { value: 'https://vimeo.com/999999' } })

    const submitBtn = screen.getByRole('button', { name: /Nạp video vào player/i })
    fireEvent.click(submitBtn)

    expect(
      screen.getByText(/Đường link không phải từ YouTube/i)
    ).toBeInTheDocument()
  })

  it('allows importing a valid YouTube URL from the quick URL bar and displays it', () => {
    render(<App />)

    const quickInput = screen.getByPlaceholderText(/Dán link YouTube bất kỳ/)
    fireEvent.change(quickInput, {
      target: { value: 'https://www.youtube.com/watch?v=arj7oStGLkU' },
    })

    const submitBtn = screen.getByRole('button', { name: /Nạp video/i })
    fireEvent.click(submitBtn)

    expect(screen.getByText(/YouTube ID: arj7oStGLkU/i)).toBeInTheDocument()
  })

  it('navigates to Vocabulary tab and shows empty state', () => {
    render(<App />)

    const vocabTabBtn = screen.getAllByText('Từ vựng')[0]
    fireEvent.click(vocabTabBtn)

    expect(screen.getByText('Chưa có từ vựng nào trong sổ tay')).toBeInTheDocument()
  })

  it('navigates to Progress tab and displays statistics overview', () => {
    render(<App />)

    const progressTabBtn = screen.getAllByText('Tiến độ')[0]
    fireEvent.click(progressTabBtn)

    expect(screen.getByText('Tiến độ & Kết quả rèn luyện')).toBeInTheDocument()
    expect(screen.getByText('Câu đã luyện tập')).toBeInTheDocument()
    expect(screen.getByText('Điểm TB tương đồng')).toBeInTheDocument()
  })

  it('opens and closes keyboard shortcuts modal', () => {
    render(<App />)

    const shortcutsBtn = screen.getByTitle('Xem danh sách phím tắt hữu ích')
    fireEvent.click(shortcutsBtn)

    expect(screen.getByText('Phím tắt học tập nhanh')).toBeInTheDocument()
    expect(
      screen.getByText('Kiểm tra đáp án câu trả lời trong ô gõ chữ')
    ).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /Đã hiểu/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByText('Phím tắt học tập nhanh')).not.toBeInTheDocument()
  })
})
