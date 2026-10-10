import React, { useState } from 'react'
import { Link2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import { parseYouTubeUrl } from './urlParser'

interface YouTubeImportFormProps {
  onImportVideo: (videoId: string, customTitle?: string) => void
}

export const YouTubeImportForm: React.FC<YouTubeImportFormProps> = ({
  onImportVideo,
}) => {
  const [urlInput, setUrlInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSuccess(false)

    const result = parseYouTubeUrl(urlInput)
    if (!result.isValid || !result.videoId) {
      setErrorMessage(result.error || 'Đường link YouTube không hợp lệ.')
      return
    }

    setIsSuccess(true)
    onImportVideo(result.videoId, titleInput.trim() || undefined)
    setUrlInput('')
    setTitleInput('')
    setTimeout(() => setIsSuccess(false), 3000)
  }

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrlInput(text)
        setErrorMessage(null)
      }
    } catch {
      // clipboard access denied or unsupported
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
          <Link2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Nhập video YouTube bất kỳ
          </h3>
          <p className="text-xs text-slate-500">
            Hỗ trợ link đầy đủ, youtu.be, Shorts, Embed và Live stream
          </p>
        </div>
      </div>

      <form onSubmit={handleImport} className="space-y-3 mt-4">
        <div className="relative">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value)
              if (errorMessage) setErrorMessage(null)
            }}
            placeholder="Dán link YouTube (ví dụ: https://www.youtube.com/watch?v=...)"
            className="w-full pl-3.5 pr-20 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none text-slate-800 placeholder-slate-400 font-mono"
          />
          <button
            type="button"
            onClick={handleQuickPaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs"
          >
            Dán
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Tên bài học tuỳ chọn (ví dụ: Daily English Conversation)"
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none text-slate-700"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nạp video vào player</span>
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Đã nạp video vào trình phát thành công!</span>
          </div>
        )}

        {/* Informational note regarding YouTube playback & segments */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 leading-relaxed">
          <p className="font-semibold mb-0.5">Luyện nghe với mọi video YouTube:</p>
          <p className="text-indigo-700">
            Video sau khi nạp sẽ phát qua trình phát YouTube chính thức. Bạn có thể tự do thêm các mốc phân đoạn câu để nghe lặp lại, chép chính tả và đối chiếu chấm điểm chi tiết.
          </p>
        </div>
      </form>
    </div>
  )
}
