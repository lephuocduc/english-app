import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DailyStreakBadge } from '../components/DailyStreakBadge'
import { DailyStreakModal } from '../components/DailyStreakModal'
import { AutoStartModal } from '../components/AutoStartModal'
import type { StreakData } from '../types'

describe('Daily Streak & AutoStart UI Components', () => {
  const mockStreak: StreakData = {
    currentStreak: 4,
    longestStreak: 7,
    lastActiveDate: '2026-11-09',
    freezeUsedDates: ['2026-11-06'],
    lastFreezeWeek: '2026-W45',
    freezeAvailable: true,
    todayCompleted: true,
    totalDaysActive: 10,
  }

  it('renders DailyStreakBadge with flame icon and streak count', () => {
    const handleClick = vi.fn()
    render(<DailyStreakBadge streak={mockStreak} onClick={handleClick} />)

    expect(screen.getByText('4')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: /Daily streak: 4 days/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders DailyStreakModal with details and Streak Freeze explanation', () => {
    const handleClose = vi.fn()
    const handlePractice = vi.fn()

    render(
      <DailyStreakModal
        isOpen={true}
        onClose={handleClose}
        streak={mockStreak}
        onStartPractice={handlePractice}
      />
    )

    // Heading
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/4/)).toBeInTheDocument()
    expect(screen.getByText(/Ngày Liên Tục/i)).toBeInTheDocument()

    // Streak Freeze section
    expect(screen.getByText(/Cơ chế "Streak Freeze"/i)).toBeInTheDocument()
    expect(screen.getByText(/nghỉ/i)).toBeInTheDocument()
    expect(screen.getByText(/đứt chuỗi là bỏ luôn/i)).toBeInTheDocument()
    expect(screen.getByText(/Sẵn sàng/i)).toBeInTheDocument()

    // Stats
    expect(screen.getByText('7')).toBeInTheDocument() // Longest streak
    expect(screen.getByText('10')).toBeInTheDocument() // Total days
  })

  it('renders AutoStartModal with Windows auto-start guide', () => {
    const handleClose = vi.fn()
    render(<AutoStartModal isOpen={true} onClose={handleClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Tự Động Mở Cùng Máy Tính/i)).toBeInTheDocument()
    expect(screen.getByText(/Khởi động cùng Windows/i)).toBeInTheDocument()
    expect(screen.getByText(/Tự động đăng nhập/i)).toBeInTheDocument()
    expect(screen.getByText(/Sẵn sàng nghe bài tiếp theo/i)).toBeInTheDocument()
    expect(screen.getByText(/setup-windows-autostart.bat/i)).toBeInTheDocument()
  })
})

