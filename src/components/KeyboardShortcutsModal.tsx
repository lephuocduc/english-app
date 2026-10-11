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
      description: 'Submit and check your typed answer',
    },
    {
      keys: ['Ctrl', 'Space'],
      orKeys: ['Alt', 'R'],
      description: 'Replay current sentence segment from start',
    },
    {
      keys: ['Alt', 'Z'],
      description: 'Toggle Focus / Zen Mode',
    },
    {
      keys: ['Alt', 'B'],
      description: 'Toggle video curtain (Blind Listening Mode)',
    },
    {
      keys: ['Alt', 'A'],
      description: 'Show / hide answer transcript & translation',
    },
    {
      keys: ['Alt', 'L'],
      description: 'Toggle sentence segment auto-loop playback',
    },
    {
      keys: ['Alt', '←'],
      description: 'Go to previous sentence in lesson',
    },
    {
      keys: ['Alt', '→'],
      description: 'Go to next sentence',
    },
    {
      keys: ['Space'],
      description: 'Play / Pause video (outside text input)',
    },
    {
      keys: ['?'],
      description: 'Toggle keyboard shortcuts guide',
    },
    {
      keys: ['Esc'],
      description: 'Close this dialog / Exit Focus mode',
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
                Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Accelerate dictation workflows entirely with your keyboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
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
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
