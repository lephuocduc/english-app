import React from 'react'
import {
  Headphones,
  BookOpen,
  Bookmark,
  TrendingUp,
  Keyboard,
} from 'lucide-react'
import type { NavTab } from '../types'
import { storage } from '../lib/storage/storage'

interface NavbarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onOpenKeyboardShortcuts: () => void
  vocabularyCount: number
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenKeyboardShortcuts,
  vocabularyCount,
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => onSelectTab('practice')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 group-hover:bg-indigo-700 transition">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                  ListenFlow
                </span>
                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none">
                Luyện nghe &amp; Chép chính tả YouTube
              </p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer relative ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right helper tools */}
          <div className="flex items-center gap-2">
            {/* Cloudflare D1 Sync Status Indicator & Button */}
            <button
              type="button"
              onClick={() => {
                storage.syncWithCloud().catch(() => {})
              }}
              title="Lưu trữ & Đồng bộ dữ liệu Cloudflare D1"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200/60 rounded-lg transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline font-mono text-[11px] font-semibold">Cloud D1</span>
            </button>

            <button
              type="button"
              onClick={onOpenKeyboardShortcuts}
              title="Xem danh sách phím tắt hữu ích"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Phím tắt</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <nav className="md:hidden flex items-center justify-around py-2 border-t border-slate-100">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2 text-[11px] font-semibold transition cursor-pointer relative ${
                  isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
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
