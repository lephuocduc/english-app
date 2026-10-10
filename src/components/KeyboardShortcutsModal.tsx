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
      keys: ['Space'],
      description: 'Tạm dừng hoặc tiếp tục phát video (khi không ở trong ô nhập)',
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
      keys: ['?'],
      description: 'Bật/tắt hộp thoại danh sách phím tắt',
    },
    {
      keys: ['Esc'],
      description: 'Đóng hộp thoại trợ giúp này',
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="shortcuts-modal-title" className="text-sm font-bold text-slate-900">
                Phím tắt học tập nhanh
              </h3>
              <p className="text-[11px] text-slate-500">
                Tối ưu hóa tốc độ nghe và chép không cần dùng chuột
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại phím tắt"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span className="text-xs text-slate-700 leading-snug">
                {item.description}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-800 border border-slate-300 rounded shadow-2xs"
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
                        className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-800 border border-slate-300 rounded shadow-2xs"
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
