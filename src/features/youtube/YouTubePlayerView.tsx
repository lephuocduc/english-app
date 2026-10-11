import React from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  RefreshCw,
  Volume2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
  Headphones,
} from 'lucide-react'
import type { SentenceSegment } from '../../types'

interface YouTubePlayerViewProps {
  containerId: string
  videoId: string
  isReady: boolean
  isPlaying: boolean
  isLooping?: boolean
  isBlindListening?: boolean
  playerError: string | null
  currentSpeed: number
  activeSegment: SentenceSegment | null
  onPlaySegment: () => void
  onTogglePlayPause: () => void
  onToggleLoop?: () => void
  onToggleBlindListening?: () => void
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
  isBlindListening = false,
  playerError,
  currentSpeed,
  activeSegment,
  onPlaySegment,
  onTogglePlayPause,
  onToggleLoop,
  onToggleBlindListening,
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Video Container (Responsive 16:9) */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Actual IFrame target div */}
        <div id={containerId} className="w-full h-full" />

        {/* Loading overlay */}
        {!isReady && !playerError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-slate-300 gap-3 z-10">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm font-medium">Đang tải trình phát YouTube IFrame...</p>
          </div>
        )}

        {/* Blind Listening Overlay (Glassmorphism Curtain) */}
        {isBlindListening && !playerError && (
          <div className="absolute inset-0 z-15 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-fade-in">
            <div className="relative mb-3 flex items-center justify-center">
              <span className={`absolute w-20 h-20 rounded-full bg-indigo-500/20 ${isPlaying ? 'animate-ping' : ''}`} />
              <span className={`absolute w-16 h-16 rounded-full bg-indigo-500/30 ${isPlaying ? 'animate-pulse' : ''}`} />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                <Headphones className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-2">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
              <span>Chế độ Nghe mù (Blind Listening)</span>
            </div>

            <p className="text-xs text-slate-300 max-w-sm mb-3.5 leading-relaxed">
              Hình ảnh đã được che lại để bạn tập trung hoàn toàn vào thính giác, loại bỏ sự chú ý khỏi khẩu hình miệng và phụ đề.
            </p>

            {onToggleBlindListening && (
              <button
                type="button"
                onClick={onToggleBlindListening}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-slate-200 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Tắt rèm che video (Alt + B)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem lại video (Alt + B)</span>
              </button>
            )}
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
      <div className="p-3 sm:p-3.5 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-2.5 transition-colors">
        {/* Tier 1: Segment info & Sentence navigation stepper */}
        <div className="flex items-center justify-between gap-2">
          {/* Active Segment Time Pill with Live Playback Indicator */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs min-w-0">
            <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? 'text-emerald-500 animate-pulse' : 'text-indigo-500'}`} />
            <span className="truncate">
              {activeSegment ? (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Phân đoạn:</span>{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {formatTime(activeSegment.startTime)} - {formatTime(activeSegment.endTime)}
                  </strong>{' '}
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    ({(activeSegment.endTime - activeSegment.startTime).toFixed(0)}s)
                  </span>
                </>
              ) : (
                'Chưa chọn phân đoạn'
              )}
            </span>
            {isPlaying && (
              <span className="shrink-0 inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 animate-pulse whitespace-nowrap">
                Đang phát
              </span>
            )}
            {isLooping && (
              <span className="shrink-0 hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 whitespace-nowrap">
                <Repeat className="w-2.5 h-2.5" /> Loop
              </span>
            )}
            {isBlindListening && (
              <span className="shrink-0 hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-200/60 dark:border-violet-800/60 whitespace-nowrap">
                <EyeOff className="w-2.5 h-2.5" /> Nghe mù
              </span>
            )}
          </div>

          {/* Stepper: Previous / Next Sentence Button Group */}
          {(onPreviousSegment || onNextSegment) && (
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-0.5 shadow-2xs shrink-0">
              {onPreviousSegment && (
                <button
                  type="button"
                  onClick={onPreviousSegment}
                  disabled={!hasPreviousSegment}
                  title="Phát câu trước (Alt + ←)"
                  aria-label="Phát câu trước"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-1 select-none whitespace-nowrap">
                Chuyển câu
              </span>
              {onNextSegment && (
                <button
                  type="button"
                  onClick={onNextSegment}
                  disabled={!hasNextSegment}
                  title="Phát câu tiếp theo (Alt + →)"
                  aria-label="Phát câu tiếp theo"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-lg transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tier 2: Playback Actions & Mode Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {/* Left: Core Playback Actions (Hero Replay & Pause/Resume) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Repeat Segment (Hero Action) */}
            <button
              type="button"
              onClick={onPlaySegment}
              disabled={!isReady || !activeSegment}
              title="Nghe lại phân đoạn câu hiện tại từ đầu (Ctrl + Space hoặc Alt + R)"
              aria-label="Nghe lại phân đoạn câu hiện tại"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Nghe lại câu</span>
            </button>

            {/* Toggle play/pause (Pause / Resume) */}
            <button
              type="button"
              onClick={onTogglePlayPause}
              disabled={!isReady}
              title={isPlaying ? 'Tạm dừng phát (Space)' : 'Tiếp tục phát (Space)'}
              aria-label={isPlaying ? 'Tạm dừng video' : 'Tiếp tục phát video'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition active:scale-95 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${
                isPlaying
                  ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200/80 dark:border-amber-800'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                  <span>Tiếp tục</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Study Modes & Utilities */}
          <div className="flex items-center gap-1.5">
            {/* Loop Toggle */}
            {onToggleLoop && (
              <button
                type="button"
                onClick={onToggleLoop}
                title={isLooping ? 'Tắt lặp lại câu (Alt + L)' : 'Bật tự động lặp lại câu (Alt + L)'}
                aria-label="Tự động lặp lại câu"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap ${
                  isLooping
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <Repeat className={`w-3.5 h-3.5 shrink-0 ${isLooping ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Lặp câu{isLooping ? ' (Bật)' : ''}</span>
              </button>
            )}

            {/* Blind Listening Toggle */}
            {onToggleBlindListening && (
              <button
                type="button"
                onClick={onToggleBlindListening}
                title={isBlindListening ? 'Tắt chế độ nghe mù (Alt + B)' : 'Bật chế độ nghe mù - che hình ảnh để tập trung nghe (Alt + B)'}
                aria-label="Chế độ nghe mù"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap ${
                  isBlindListening
                    ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <EyeOff className={`w-3.5 h-3.5 shrink-0 ${isBlindListening ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Nghe mù</span>
              </button>
            )}

            {/* Speed Switcher */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs">
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeSpeed(s)}
                  disabled={!isReady}
                  title={`Đặt tốc độ phát ${s}x`}
                  aria-label={`Tốc độ phát ${s}x`}
                  className={`px-1.5 py-1 text-[11px] font-mono font-bold rounded-lg transition ${
                    currentSpeed === s
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Reload Video Frame */}
            {onReloadPlayer && (
              <button
                type="button"
                onClick={onReloadPlayer}
                title="Làm mới khung hình video (khắc phục lỗi màn hình đen khi chuyển tab)"
                aria-label="Làm mới khung hình video"
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
