import React, { useState, useEffect } from 'react'
import {
  X,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Database,
  Key,
  Download,
  Upload,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import {
  getStoredUserId,
  setStoredUserId,
  CLOUDFLARE_WORKER_DEFAULT_API,
} from '../lib/api/client'
import { storage } from '../lib/storage/storage'

interface CloudSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onSyncComplete?: () => void
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [syncId, setSyncId] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success?: boolean
    message?: string
  } | null>(null)
  const [healthStatus, setHealthStatus] = useState<
    'checking' | 'connected' | 'error'
  >('checking')

  useEffect(() => {
    if (isOpen) {
      setSyncId(getStoredUserId())
      setSyncResult(null)
      checkHealth()
    }
  }, [isOpen])

  const checkHealth = async () => {
    setHealthStatus('checking')
    try {
      const res = await fetch(`${CLOUDFLARE_WORKER_DEFAULT_API}/health`)
      const data = await res.json()
      if (data.database === 'connected') {
        setHealthStatus('connected')
      } else {
        setHealthStatus('error')
      }
    } catch {
      setHealthStatus('error')
    }
  }

  if (!isOpen) return null

  const handleCopyId = () => {
    navigator.clipboard.writeText(syncId)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleSaveSyncId = (newVal: string) => {
    const trimmed = newVal.trim()
    setSyncId(trimmed)
    if (trimmed) {
      setStoredUserId(trimmed)
    }
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const res = await storage.syncWithCloud()
      setSyncResult({
        success: true,
        message: `Đồng bộ thành công! (${res.lessonsCount} bài học, ${res.vocabCount} từ vựng, ${res.progressCount} tiến độ câu)`,
      })
      if (onSyncComplete) onSyncComplete()
    } catch {
      setSyncResult({
        success: false,
        message: 'Lỗi trong quá trình đồng bộ với Cloudflare D1. Vui lòng thử lại.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        userId: syncId,
        videos: storage.loadVideos(),
        vocabulary: storage.loadVocabulary(),
        preferences: storage.loadPreferences(),
        progress: {} as Record<string, unknown>,
      }
      const videos = storage.loadVideos() || []
      videos.forEach((v) => {
        const prog = storage.loadLessonProgress(v.id)
        if (prog) backupData.progress[v.id] = prog
      })

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `listenflow-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json.videos) storage.saveVideos(json.videos)
        if (json.vocabulary) storage.saveVocabulary(json.vocabulary)
        if (json.preferences) storage.savePreferences(json.preferences)
        if (json.progress) {
          Object.entries(json.progress).forEach(([lessonId, prog]) => {
            window.localStorage.setItem(
              `listenflow_progress_${lessonId}`,
              JSON.stringify(prog)
            )
          })
        }
        setSyncResult({
          success: true,
          message: 'Khôi phục dữ liệu từ tệp sao lưu thành công!',
        })
        if (onSyncComplete) onSyncComplete()
      } catch {
        setSyncResult({
          success: false,
          message: 'Tệp JSON không hợp lệ hoặc bị lỗi cấu trúc.',
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-sync-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-200/60 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="cloud-sync-title"
                className="text-lg font-bold text-slate-900"
              >
                Đồng bộ Cloudflare D1
              </h3>
              <p className="text-xs text-slate-500">
                Lưu trữ đám mây &amp; đồng bộ tiến độ đa thiết bị
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Cloudflare D1 Database
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  listenflow-db (APAC)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {healthStatus === 'checking' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang kiểm tra...
                </span>
              )}
              {healthStatus === 'connected' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã kết nối
                </span>
              )}
              {healthStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Không thể kết nối
                </span>
              )}
            </div>
          </div>

          {/* Sync User ID Field */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                Mã định danh đồng bộ (Sync User ID)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Dùng cùng mã này trên các thiết bị
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={syncId}
                onChange={(e) => handleSaveSyncId(e.target.value)}
                placeholder="Nhập mã đồng bộ của bạn..."
                className="flex-1 px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-slate-800"
              />
              <button
                type="button"
                onClick={handleCopyId}
                title="Sao chép mã"
                className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 <strong>Mẹo:</strong> Nhập cùng mã định danh này trên máy tính khác hoặc điện thoại để tự động truy cập cùng tiến độ học tập và bài nghe.
            </p>
          </div>

          {/* Sync Feedback Message */}
          {syncResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                syncResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncNow}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay với Cloudflare D1'}</span>
            </button>

            {/* Offline backup options */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất file JSON</span>
              </button>
              <label className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Nhập file JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
