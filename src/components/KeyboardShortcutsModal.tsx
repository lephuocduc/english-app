import React, { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcuts = [
    {
      keys: ['Enter'],
      description: 'Kiểm tra đáp án câu trả lời trong ô gõ chữ',
    },
    {
      keys: ['Ctrl', 'Space'],
      orKeys: ['Alt', 'R'],
      description: 'Nghe lại phân đoạn câu hiện tại từ đầu mốc thời gian',
    },
    {
      keys: ['Alt', 'Z'],
      description: 'Bật / tắt Chế độ tập trung cao độ (Zen Mode)',
    },
    {
      keys: ['Alt', 'B'],
      description: 'Bật / tắt Rèm che video (Chế độ nghe mù - Blind Listening)',
    },
    {
      keys: ['Alt', 'A'],
      description: 'Hiện / ẩn đáp án và bản dịch câu hiện tại',
    },
    {
      keys: ['Alt', 'L'],
      description: 'Bật/tắt tự động lặp lại phân đoạn câu (Loop)',
    },
    {
      keys: ['Alt', '←'],
      description: 'Chuyển về câu trước đó trong bài học',
    },
    {
      keys: ['Alt', '→'],
      description: 'Chuyển sang câu kế tiếp',
    },
    {
      keys: ['Space'],
      description: 'Tạm dừng hoặc tiếp tục phát video (khi không ở trong ô nhập)',
    },
    {
      keys: ['?'],
      description: 'Bật/tắt hộp thoại danh sách phím tắt',
    },
    {
      keys: ['Esc'],
      description: 'Đóng hộp thoại này / Thoát chế độ tập trung',
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="shortcuts-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Phím tắt học tập nhanh
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tối ưu hóa tốc độ nghe và chép hoàn toàn bằng bàn phím
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại phím tắt"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800"
            >
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                {item.description}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
                {item.orKeys && (
                  <>
                    <span className="text-[10px] text-slate-400 font-semibold px-0.5">
                      /
                    </span>
                    {item.orKeys.map((ok, okIdx) => (
                      <kbd
                        key={okIdx}
                        className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded shadow-2xs"
                      >
                        {ok}
                      </kbd>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}
