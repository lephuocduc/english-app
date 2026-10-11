import React from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  RefreshCw,
  Gauge,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { SentenceSegment } from '../../types'

interface YouTubePlayerViewProps {
  containerId: string
  videoId: string
  isReady: boolean
  isPlaying: boolean
  isLooping?: boolean
  playerError: string | null
  currentSpeed: number
  activeSegment: SentenceSegment | null
  onPlaySegment: () => void
  onTogglePlayPause: () => void
  onToggleLoop?: () => void
  onReloadPlayer?: () => void
  onChangeSpeed: (speed: number) => void
  onPreviousSegment?: () => void
  onNextSegment?: () => void
  hasPreviousSegment?: boolean
  hasNextSegment?: boolean
}

export const YouTubePlayerView: React.FC<YouTubePlayerViewProps> = ({
  containerId,
  videoId,
  isReady,
  isPlaying,
  isLooping = false,
  playerError,
  currentSpeed,
  activeSegment,
  onPlaySegment,
  onTogglePlayPause,
  onToggleLoop,
  onReloadPlayer,
  onChangeSpeed,
  onPreviousSegment,
  onNextSegment,
  hasPreviousSegment = false,
  hasNextSegment = false,
}) => {
  const speeds = [0.75, 1.0, 1.25]

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Video Container (Responsive 16:9) */}
      <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center">
        {/* Actual IFrame target div */}
        <div id={containerId} className="w-full h-full" />

        {/* Loading overlay */}
        {!isReady && !playerError && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-slate-300 gap-3 z-10">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">Đang tải trình phát YouTube IFrame...</p>
          </div>
        )}

        {/* Error overlay */}
        {playerError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-rose-300 z-20">
            <AlertTriangle className="w-12 h-12 text-rose-400 mb-2" />
            <h4 className="text-base font-semibold text-rose-200 mb-1">
              Không thể phát video này
            </h4>
            <p className="text-sm text-slate-300 max-w-md mb-4">{playerError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onReloadPlayer && (
                <button
                  type="button"
                  onClick={onReloadPlayer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tải lại video</span>
                </button>
              )}
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg border border-slate-700 transition"
              >
                Mở trực tiếp trên YouTube <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="p-3 sm:p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Active Segment Time Pill with Live Playback Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-600 animate-pulse' : 'text-indigo-600'}`} />
          <span>
            {activeSegment ? (
              <>
                Phân đoạn:{' '}
                <strong className="text-slate-900 font-mono">
                  {formatTime(activeSegment.startTime)} - {formatTime(activeSegment.endTime)}
                </strong>{' '}
                <span className="text-slate-400">
                  ({(activeSegment.endTime - activeSegment.startTime).toFixed(0)}s)
                </span>
                {isPlaying && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                    Đang phát
                  </span>
                )}
                {isLooping && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title="Chế độ tự động lặp phân đoạn đang bật">
                    <Repeat className="w-3 h-3 text-indigo-600" /> Loop
                  </span>
                )}
              </>
            ) : (
              'Chưa chọn phân đoạn'
            )}
          </span>
        </div>

        {/* Playback Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Previous Sentence Button */}
          {onPreviousSegment && (
            <button
              type="button"
              onClick={onPreviousSegment}
              disabled={!hasPreviousSegment}
              title="Phát câu trước (Alt + ←)"
              aria-label="Phát câu trước"
              className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
          )}

          {/* Repeat segment */}
          <button
            type="button"
            onClick={onPlaySegment}
            disabled={!isReady || !activeSegment}
            title="Nghe lại phân đoạn câu hiện tại từ đầu (Phím tắt: Ctrl + Space hoặc Alt + R)"
            aria-label="Nghe lại phân đoạn câu hiện tại"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-2xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nghe lại câu</span>
          </button>

          {/* Loop toggle button */}
          {onToggleLoop && (
            <button
              type="button"
              onClick={onToggleLoop}
              title={isLooping ? 'Tắt lặp lại câu (Alt + L)' : 'Bật tự động lặp lại câu (Alt + L)'}
              aria-label="Tự động lặp lại câu"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                isLooping
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'text-white' : 'text-slate-600'}`} />
              <span>Lặp câu{isLooping ? ' (Bật)' : ''}</span>
            </button>
          )}

          {/* Toggle play/pause (Pause / Resume) */}
          <button
            type="button"
            onClick={onTogglePlayPause}
            disabled={!isReady}
            title={isPlaying ? 'Tạm dừng phát (Phím tắt: Space khi không gõ chữ)' : 'Tiếp tục phát (Phím tắt: Space)'}
            aria-label={isPlaying ? 'Tạm dừng video' : 'Tiếp tục phát video'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border shadow-2xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
              isPlaying
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Tiếp tục</span>
              </>
            )}
          </button>

          {/* Next Sentence Button */}
          {onNextSegment && (
            <button
              type="button"
              onClick={onNextSegment}
              disabled={!hasNextSegment}
              title="Phát câu tiếp theo (Alt + →)"
              aria-label="Phát câu tiếp theo"
              className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          )}

          {/* Reload Frame Button */}
          {onReloadPlayer && (
            <button
              type="button"
              onClick={onReloadPlayer}
              title="Làm mới khung hình video (khắc phục lỗi màn hình đen khi chuyển tab)"
              aria-label="Làm mới khung hình video"
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Speed switcher */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <span className="pl-2 pr-1 text-slate-400" title="Tốc độ phát">
              <Gauge className="w-3.5 h-3.5" />
            </span>
            {speeds.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeSpeed(s)}
                disabled={!isReady}
                title={`Đặt tốc độ phát ${s}x`}
                aria-label={`Tốc độ phát ${s}x`}
                className={`px-2 py-1 text-xs font-medium rounded-md transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  currentSpeed === s
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
