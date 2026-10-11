import React from 'react'
import {
  Headphones,
  BookOpen,
  Bookmark,
  TrendingUp,
  Keyboard,
  Moon,
  Sun,
  Maximize2,
} from 'lucide-react'
import type { NavTab } from '../types'
import { storage } from '../lib/storage/storage'

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
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'practice',
      label: 'Luyện tập',
      icon: <Headphones className="w-4 h-4" />,
    },
    {
      id: 'lessons',
      label: 'Video của tôi',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'vocabulary',
      label: 'Từ vựng',
      icon: <Bookmark className="w-4 h-4" />,
      badge: vocabularyCount > 0 ? vocabularyCount : undefined,
    },
    {
      id: 'progress',
      label: 'Tiến độ',
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
                Luyện nghe &amp; Chép chính tả YouTube
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
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer relative ${
                    isActive
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

          {/* Right helper tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Focus / Zen Mode Button */}
            {onToggleFocusMode && activeTab === 'practice' && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                title={isFocusMode ? 'Thoát chế độ tập trung (Alt + Z)' : 'Bật chế độ tập trung cao độ (Alt + Z)'}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  isFocusMode
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Tập trung</span>
              </button>
            )}

            {/* Dark / Light Mode Toggle Button */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title={isDarkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối (Bảo vệ mắt)'}
                aria-label="Chuyển đổi giao diện Sáng/Tối"
                className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg transition cursor-pointer"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden xl:inline text-amber-300">Sáng</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden xl:inline">Tối</span>
                  </>
                )}
              </button>
            )}

            {/* Cloudflare D1 Sync Status Indicator & Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenCloudSync) {
                  onOpenCloudSync()
                } else {
                  storage.syncWithCloud().catch(() => {})
                }
              }}
              title="Lưu trữ & Đồng bộ dữ liệu Cloudflare D1"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline font-mono text-[11px] font-semibold">Cloud D1</span>
            </button>

            {/* Keyboard Shortcuts Dialog Trigger */}
            <button
              type="button"
              onClick={onOpenKeyboardShortcuts}
              title="Xem danh sách phím tắt hữu ích"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200/60 dark:border-slate-700/60 rounded-lg transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Phím tắt</span>
            </button>
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
                className={`flex flex-col items-center gap-1 py-1 px-2 text-[11px] font-semibold transition cursor-pointer relative ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
