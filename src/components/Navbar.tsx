import React, { useState, useRef, useEffect } from 'react'
import {
  Headphones,
  BookOpen,
  Bookmark,
  TrendingUp,
  Keyboard,
  Moon,
  Sun,
  Maximize2,
  Monitor,
  Settings,
  Cloud,
} from 'lucide-react'
import type { NavTab, StreakData } from '../types'
import { storage } from '../lib/storage/storage'
import { DailyStreakBadge } from './DailyStreakBadge'

interface NavbarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenKeyboardShortcuts: () => void
  onOpenCloudSync?: () => void
  vocabularyCount: number
  isDarkMode?: boolean
  onToggleDarkMode?: () => void
  isFocusMode?: boolean
  onToggleFocusMode?: () => void
  streak?: StreakData
  onOpenStreakModal?: () => void
  onOpenAutoStartModal?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenKeyboardShortcuts,
  onOpenCloudSync,
  vocabularyCount,
  isDarkMode = false,
  onToggleDarkMode,
  isFocusMode = false,
  onToggleFocusMode,
  streak,
  onOpenStreakModal,
  onOpenAutoStartModal,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'practice',
      label: 'Practice',
      icon: <Headphones className="w-4 h-4" />,
    },
    {
      id: 'lessons',
      label: 'My Videos',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'vocabulary',
      label: 'Vocabulary',
      icon: <Bookmark className="w-4 h-4" />,
      badge: vocabularyCount > 0 ? vocabularyCount : undefined,
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => onSelectTab('practice')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:bg-indigo-700 transition">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  ListenFlow
                </span>
                <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/60 font-mono text-[10px] font-bold rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium leading-none">
                YouTube Listening &amp; Dictation
              </p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer relative ${isActive
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right helper tools - Clean & Minimalist */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Daily Streak Counter with Flame icon */}
            {streak && onOpenStreakModal && (
              <DailyStreakBadge streak={streak} onClick={onOpenStreakModal} />
            )}

            {/* Dark / Light Mode Toggle */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title={isDarkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                aria-label="Toggle Light/Dark Theme"
                className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg transition cursor-pointer"
              >
                {isDarkMode ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>
            )}

            {/* Settings & Tools Dropdown Menu */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                title="Cài đặt & Tiện ích"
                aria-label="Settings and tools menu"
                className={`p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                  isSettingsOpen
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cài đặt</span>
              </button>

              {/* Dropdown Menu Popup */}
              {isSettingsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* Focus / Zen Mode */}
                  {onToggleFocusMode && activeTab === 'practice' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsSettingsOpen(false)
                        onToggleFocusMode()
                      }}
                      className={`w-full px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer ${
                        isFocusMode ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Chế độ Zen (Focus){isFocusMode ? ' (Bật)' : ''}</span>
                      </div>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
                        Alt+Z
                      </kbd>
                    </button>
                  )}

                  {/* Windows Auto-Start */}
                  {onOpenAutoStartModal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsSettingsOpen(false)
                        onOpenAutoStartModal()
                      }}
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tự mở khi bật máy tính</span>
                    </button>
                  )}

                  {/* Cloudflare D1 Storage & Sync */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsSettingsOpen(false)
                      if (onOpenCloudSync) {
                        onOpenCloudSync()
                      } else {
                        storage.syncWithCloud().catch(() => {})
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Đồng bộ Cloud D1</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Keyboard Shortcuts Dialog Trigger */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsSettingsOpen(false)
                      onOpenKeyboardShortcuts()
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Bảng phím tắt</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
                      ?
                    </kbd>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <nav className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2 text-[11px] font-semibold transition cursor-pointer relative ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
