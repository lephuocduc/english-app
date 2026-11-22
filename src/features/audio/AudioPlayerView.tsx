import React from 'react'
import {
  Phone,
  PhoneCall,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Volume2,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import type { SentenceSegment, VoiceAccent } from '../../types'

interface AudioPlayerViewProps {
  lessonTitle: string
  level?: string
  isPlaying: boolean
  isLoadingAudio: boolean
  isLooping?: boolean
  isPhoneCallMode?: boolean
  hasLeadIn?: boolean
  usingFallbackSpeech?: boolean
  fallbackAccentMissing?: boolean
  activeSpeaker?: string | null
  activeSpeakerIndex?: number
  speakerCount?: number
  audioError: string | null
  currentSpeed: number
  voiceAccent: VoiceAccent
  activeSegment: SentenceSegment | null
  totalDurationSeconds: number
  onPlaySegment: () => void
  onTogglePlayPause: () => void
  onToggleLoop?: () => void
  onTogglePhoneCallMode?: () => void
  onToggleLeadIn?: () => void
  onChangeSpeed: (speed: number) => void
  onChangeAccent?: (accent: VoiceAccent) => void
}

const ACCENT_OPTIONS: { value: VoiceAccent; label: string; title: string }[] = [
  { value: 'en-GB', label: 'UK', title: 'British English (UK)' },
  { value: 'en-US', label: 'US', title: 'American English (US)' },
  { value: 'en-AU', label: 'AU', title: 'Australian English (AU)' },
]

const SPEAKER_STAGE_PILLS = [
  {
    badge: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
    voiceLabel: 'Giọng A',
  },
  {
    badge: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200',
    voiceLabel: 'Giọng B',
  },
  {
    badge: 'bg-violet-500/20 border-violet-400/40 text-violet-200',
    voiceLabel: 'Giọng C',
  },
  {
    badge: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
    voiceLabel: 'Giọng D',
  },
]

export const AudioPlayerView: React.FC<AudioPlayerViewProps> = ({
  lessonTitle,
  level = 'Intermediate',
  isPlaying,
  isLoadingAudio,
  isLooping = true,
  isPhoneCallMode = true,
  hasLeadIn = false,
  usingFallbackSpeech = false,
  fallbackAccentMissing = false,
  activeSpeaker,
  activeSpeakerIndex = 0,
  speakerCount = 0,
  audioError,
  currentSpeed,
  voiceAccent,
  activeSegment,
  totalDurationSeconds,
  onPlaySegment,
  onTogglePlayPause,
  onToggleLoop,
  onTogglePhoneCallMode,
  onToggleLeadIn,
  onChangeSpeed,
  onChangeAccent,
}) => {
  const speeds = [0.75, 1.0, 1.25]
  const waveHeights = [26, 48, 72, 42, 86, 60, 34, 78, 52, 90, 44, 66, 36, 58, 30]

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Audio Visualizer & Phone Call Simulation Stage */}
      <div
        className={`relative aspect-video w-full flex flex-col items-center justify-between p-5 sm:p-6 overflow-hidden transition-colors duration-300 ${
          isPhoneCallMode
            ? 'bg-gradient-to-br from-slate-950 via-amber-950/40 to-slate-950 text-amber-100'
            : 'bg-gradient-to-br from-slate-950 via-indigo-950/60 to-slate-950 text-white'
        }`}
      >
        {/* Top Metadata Row */}
        <div className="w-full flex items-center justify-between gap-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xs text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-indigo-300" />
            <span>Text-to-Audio • {level}</span>
            {totalDurationSeconds > 0 && (
              <span className="text-slate-300 font-mono">~{formatTime(totalDurationSeconds)}</span>
            )}
          </div>

          {/* Phone Call Mode Quick Status Badge */}
          {isPhoneCallMode ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold animate-pulse">
              <PhoneCall className="w-3 h-3" />
              <span>Phone Filter 320Hz–3.2kHz</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
              <Volume2 className="w-3 h-3" />
              <span>Studio Clear Audio</span>
            </span>
          )}
        </div>

        {/* Center Icon + Equalizer Bars */}
        <div className="flex flex-col items-center justify-center gap-3 my-auto z-10 text-center max-w-md">
          <button
            type="button"
            onClick={onPlaySegment}
            aria-label="Play audio sentence"
            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer ${
              isPhoneCallMode
                ? 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-amber-500/30 hover:from-amber-500 hover:to-orange-400'
                : 'bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-indigo-500/30 hover:from-indigo-500 hover:to-violet-400'
            }`}
          >
            {isLoadingAudio ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : isPhoneCallMode ? (
              <PhoneCall className={`w-7 h-7 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
            ) : isPlaying ? (
              <Volume2 className="w-7 h-7 text-white animate-pulse" />
            ) : (
              <Play className="w-7 h-7 text-white fill-current ml-0.5" />
            )}
          </button>

          <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 px-2">
            {lessonTitle}
          </h3>

          {speakerCount >= 2 && activeSpeaker && (
            <div className="flex items-center justify-center">
              {(() => {
                const style =
                  SPEAKER_STAGE_PILLS[
                    Math.abs(activeSpeakerIndex) % SPEAKER_STAGE_PILLS.length
                  ]
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${style.badge}`}
                  >
                    <span>
                      Người nói: {activeSpeaker} • {style.voiceLabel}
                    </span>
                  </span>
                )
              })()}
            </div>
          )}

          {/* Audio Equalizer Bars */}
          <div className="flex items-end justify-center gap-1 h-9 px-4" aria-hidden="true">
            {waveHeights.map((h, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full transition-all duration-200 ${
                  isPhoneCallMode
                    ? isPlaying
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-amber-500/30'
                    : isPlaying
                      ? 'bg-indigo-400 animate-pulse'
                      : 'bg-indigo-400/30'
                }`}
                style={{
                  height: isPlaying ? `${h}%` : `${Math.max(18, Math.round(h * 0.35))}%`,
                  animationDelay: `${i * 75}ms`,
                }}
              />
            ))}
          </div>

          <p className="text-[11px] text-slate-300/90 leading-snug">
            {isPhoneCallMode
              ? 'Đang bật chế độ nghe qua điện thoại: âm thanh hẹp băng tần và có tạp âm nhẹ để luyện phản xạ thực tế.'
              : 'Nhấn Play hoặc phím Alt+R để nghe đoạn audio được tổng hợp từ văn bản.'}
          </p>
        </div>

        {/* Bottom Accent Selector */}
        <div className="w-full flex items-center justify-between gap-2 z-10 text-[11px]">
          <div className="flex items-center gap-1">
            {usingFallbackSpeech && fallbackAccentMissing ? (
              <span
                className="px-2 py-0.5 rounded bg-amber-900/70 border border-amber-500/40 text-amber-200 text-[10px] font-medium"
                title="Trình duyệt đang dùng giọng hệ thống và chưa cài gói giọng vùng này; hãy chạy server /api/tts để nghe đủ giọng US/UK/AU."
              >
                Browser Voice (thiếu giọng{' '}
                {voiceAccent === 'en-GB' ? 'UK' : voiceAccent === 'en-AU' ? 'AU' : 'US'} — cần
                /api/tts)
              </span>
            ) : (
              usingFallbackSpeech && (
                <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px]">
                  Browser Speech Voice
                </span>
              )
            )}
          </div>

          {onChangeAccent && (
            <div className="inline-flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
              <span className="px-1.5 text-[10px] text-slate-300 font-medium">Accent:</span>
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeAccent(opt.value)}
                  aria-pressed={voiceAccent === opt.value}
                  title={opt.title}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    voiceAccent === opt.value
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Overlay */}
        {audioError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-rose-300 z-20">
            <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
            <p className="text-sm font-semibold text-rose-200 mb-1">Không phát được âm thanh</p>
            <p className="text-xs text-slate-300 max-w-sm mb-3">{audioError}</p>
            <button
              type="button"
              onClick={onPlaySegment}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
        {/* Segment Timing Row */}
        {activeSegment && (
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                Segment:{' '}
                <strong className="text-slate-900 dark:text-slate-200 font-mono">
                  {formatTime(activeSegment.startTime)}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-900 dark:text-slate-200 font-mono">
                  {formatTime(activeSegment.endTime)}
                </strong>
                <span className="text-slate-400 dark:text-slate-500 ml-1.5">
                  (~{Math.max(1, Math.round(activeSegment.endTime - activeSegment.startTime))}s)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Playback Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Replay active sentence */}
            <button
              type="button"
              onClick={onPlaySegment}
              disabled={!activeSegment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-97 cursor-pointer disabled:cursor-not-allowed"
              title="Replay active sentence (Alt+R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Sentence</span>
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={onTogglePlayPause}
              disabled={!activeSegment}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Phone Call Challenge Mode Toggle */}
            {onTogglePhoneCallMode && (
              <button
                type="button"
                onClick={onTogglePhoneCallMode}
                aria-pressed={isPhoneCallMode}
                title="Bật/tắt chế độ nghe qua điện thoại (lọc dải tần 320Hz–3.2kHz & nhiễu sóng nhẹ để tăng độ khó)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  isPhoneCallMode
                    ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-200'
                }`}
              >
                {isPhoneCallMode ? (
                  <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <Phone className="w-3.5 h-3.5" />
                )}
                <span>Phone Mode</span>
              </button>
            )}

            {/* Loop */}
            {onToggleLoop && (
              <button
                type="button"
                onClick={onToggleLoop}
                aria-pressed={isLooping}
                title="Loop current sentence (Alt+L)"
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  isLooping
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'animate-spin-slow' : ''}`} />
                <span>Loop</span>
              </button>
            )}

            {/* 1s Context Lead-In */}
            {onToggleLeadIn && (
              <button
                type="button"
                onClick={onToggleLeadIn}
                aria-pressed={hasLeadIn}
                title="Nghe kèm 1 giây cuối câu trước đó để bắt nhịp liền mạch (Alt+P)"
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  hasLeadIn
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>+1s Context</span>
              </button>
            )}

            {/* Speed Selector */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs">
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeSpeed(s)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    currentSpeed === s
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
