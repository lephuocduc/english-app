import React, { useState } from 'react'
import {
  Monitor,
  Power,
  CheckCircle2,
  Copy,
  Check,
  X,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react'

interface AutoStartModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AutoStartModal: React.FC<AutoStartModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const powershellCommand = `powershell -ExecutionPolicy Bypass -File "${'E:\\ListenFlow\\scripts\\setup-windows-autostart.ps1'}"`

  const handleCopy = () => {
    navigator.clipboard?.writeText(powershellCommand).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="autostart-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Monitor className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 id="autostart-modal-title" className="text-base font-bold text-white">
                Tự Động Mở Cùng Máy Tính
              </h2>
              <p className="text-xs text-indigo-100/90">
                Tự đăng nhập &amp; sẵn sàng nghe câu tiếp theo ngay khi bật máy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
              <Power className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-indigo-950 dark:text-indigo-200">
                  1. Khởi động cùng Windows
                </h3>
                <p className="mt-0.5">
                  Mỗi khi mở máy tính, ListenFlow sẽ tự động khởi động và mở trình duyệt đến giao diện luyện nghe.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-emerald-950 dark:text-emerald-200">
                  2. Tự động đăng nhập
                </h3>
                <p className="mt-0.5">
                  Tài khoản của bạn được ghi nhớ và đăng nhập tức thì, đồng bộ toàn bộ tiến độ và từ vựng từ Cloud D1.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl">
              <PlayCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-200">
                  3. Sẵn sàng nghe bài tiếp theo
                </h3>
                <p className="mt-0.5">
                  Hệ thống tự động nhảy đến đúng câu bạn chưa hoàn thành, con trỏ sẵn sàng nhập và chỉ cần bấm Space để nghe ngay!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Script Instructions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Kích hoạt Windows Startup (Một chạm):</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã cấu hình sẵn
              </span>
            </div>
            <p className="text-slate-500 mb-2">
              Chỉ cần nhấp đúp vào file kịch bản trong thư mục dự án:
            </p>
            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
              <span>scripts\setup-windows-autostart.bat</span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-sans text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã copy' : 'Copy lệnh'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Để huỷ tự khởi động bất cứ lúc nào: chạy file <code className="text-slate-600 dark:text-slate-300 font-mono">scripts\remove-windows-autostart.bat</code>.
            </p>
          </div>

          {/* Close button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
