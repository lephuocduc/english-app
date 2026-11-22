import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceAccent } from '../../types'
import { sharedTtsAudioEngine } from '../../lib/audio/ttsAudioPlayer'

export interface UseAudioLessonPlayerOptions {
  initialSpeed?: number
  initialPhoneCallMode?: boolean
  initialLoop?: boolean
  initialAccent?: VoiceAccent
}

export interface PlayAudioTextParams {
  text: string
  leadInText?: string
  accent?: VoiceAccent
  speakerIndex?: number
  leadInSpeakerIndex?: number
}

export interface FullLessonSegmentInput {
  text: string
  speakerIndex?: number
}

export interface PlayFullLessonOptions {
  onSegmentChange?: (index: number) => void
  onComplete?: () => void
}

export function useAudioLessonPlayer({
  initialSpeed = 1.0,
  initialPhoneCallMode = true,
  initialLoop = true,
  initialAccent = 'en-GB',
}: UseAudioLessonPlayerOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayingFullLesson, setIsPlayingFullLesson] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [usingFallbackSpeech, setUsingFallbackSpeech] = useState(false)
  const [fallbackAccentMissing, setFallbackAccentMissing] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<number>(initialSpeed)
  const [isLooping, setIsLooping] = useState(initialLoop)
  const [isPhoneCallMode, setIsPhoneCallMode] = useState(initialPhoneCallMode)
  const [voiceAccent, setVoiceAccent] = useState<VoiceAccent>(initialAccent)

  const speedRef = useRef(playbackRate)
  const isLoopingRef = useRef(isLooping)
  const phoneCallModeRef = useRef(isPhoneCallMode)
  const accentRef = useRef(voiceAccent)
  const lastPlayedRef = useRef<PlayAudioTextParams | null>(null)
  const loopTimerRef = useRef<number | null>(null)
  const fullLessonRunIdRef = useRef<number>(0)
  const fullLessonTimerRef = useRef<number | null>(null)

  useEffect(() => {
    speedRef.current = playbackRate
  }, [playbackRate])

  useEffect(() => {
    isLoopingRef.current = isLooping
  }, [isLooping])

  useEffect(() => {
    phoneCallModeRef.current = isPhoneCallMode
  }, [isPhoneCallMode])

  useEffect(() => {
    accentRef.current = voiceAccent
  }, [voiceAccent])

  const clearLoopTimer = useCallback(() => {
    if (loopTimerRef.current !== null) {
      window.clearTimeout(loopTimerRef.current)
      loopTimerRef.current = null
    }
    if (fullLessonTimerRef.current !== null) {
      window.clearTimeout(fullLessonTimerRef.current)
      fullLessonTimerRef.current = null
    }
  }, [])

  const stopAudio = useCallback(() => {
    fullLessonRunIdRef.current += 1
    clearLoopTimer()
    sharedTtsAudioEngine.stop()
    setIsPlaying(false)
    setIsPlayingFullLesson(false)
    setIsLoadingAudio(false)
  }, [clearLoopTimer])

  const playTextSegment = useCallback(
    async (params: PlayAudioTextParams) => {
      fullLessonRunIdRef.current += 1
      setIsPlayingFullLesson(false)
      clearLoopTimer()
      lastPlayedRef.current = {
        text: params.text,
        leadInText: params.leadInText,
        speakerIndex: params.speakerIndex,
        leadInSpeakerIndex: params.leadInSpeakerIndex,
      }
      setAudioError(null)
      setIsLoadingAudio(true)

      const runPlay = async (withLeadIn: boolean) => {
        await sharedTtsAudioEngine.playSegment({
          text: params.text,
          leadInText: withLeadIn ? params.leadInText : undefined,
          accent: withLeadIn && params.accent ? params.accent : accentRef.current,
          speed: speedRef.current,
          speakerIndex: params.speakerIndex ?? 0,
          leadInSpeakerIndex: params.leadInSpeakerIndex,
          isPhoneCallMode: phoneCallModeRef.current,
          onFallbackUsed: (used, exactMatch) => {
            setUsingFallbackSpeech(used)
            setFallbackAccentMissing(Boolean(used && exactMatch === false))
          },
          onStart: () => {
            setIsLoadingAudio(false)
            setIsPlaying(true)
          },
          onEnd: () => {
            setIsLoadingAudio(false)
            if (isLoopingRef.current && lastPlayedRef.current?.text === params.text) {
              loopTimerRef.current = window.setTimeout(() => {
                if (isLoopingRef.current) {
                  void runPlay(false)
                } else {
                  setIsPlaying(false)
                }
              }, 350)
            } else {
              setIsPlaying(false)
            }
          },
          onError: (msg) => {
            setIsLoadingAudio(false)
            setIsPlaying(false)
            setAudioError(msg)
          },
        })
      }

      await runPlay(true)
    },
    [clearLoopTimer]
  )

  const playFullLesson = useCallback(
    async (segments: FullLessonSegmentInput[], options: PlayFullLessonOptions = {}) => {
      if (!segments || segments.length === 0) return

      const runId = ++fullLessonRunIdRef.current
      clearLoopTimer()
      sharedTtsAudioEngine.stop()
      setAudioError(null)
      setIsPlayingFullLesson(true)
      setIsLoadingAudio(true)

      const playIndex = async (idx: number) => {
        if (fullLessonRunIdRef.current !== runId) return
        if (idx >= segments.length) {
          setIsLoadingAudio(false)
          setIsPlaying(false)
          setIsPlayingFullLesson(false)
          options.onComplete?.()
          return
        }

        const seg = segments[idx]
        options.onSegmentChange?.(idx)
        setIsLoadingAudio(true)

        await sharedTtsAudioEngine.playSegment({
          text: seg.text,
          accent: accentRef.current,
          speed: speedRef.current,
          speakerIndex: seg.speakerIndex ?? 0,
          isPhoneCallMode: phoneCallModeRef.current,
          onFallbackUsed: (used, exactMatch) => {
            setUsingFallbackSpeech(used)
            setFallbackAccentMissing(Boolean(used && exactMatch === false))
          },
          onStart: () => {
            if (fullLessonRunIdRef.current !== runId) return
            setIsLoadingAudio(false)
            setIsPlaying(true)
          },
          onEnd: () => {
            if (fullLessonRunIdRef.current !== runId) return
            if (idx + 1 < segments.length) {
              fullLessonTimerRef.current = window.setTimeout(() => {
                if (fullLessonRunIdRef.current === runId) {
                  void playIndex(idx + 1)
                }
              }, 260)
            } else {
              setIsLoadingAudio(false)
              setIsPlaying(false)
              setIsPlayingFullLesson(false)
              options.onComplete?.()
            }
          },
          onError: (msg) => {
            if (fullLessonRunIdRef.current !== runId) return
            setIsLoadingAudio(false)
            setIsPlaying(false)
            setIsPlayingFullLesson(false)
            setAudioError(msg)
          },
        })
      }

      await playIndex(0)
    },
    [clearLoopTimer]
  )

  const replayLast = useCallback(() => {
    if (lastPlayedRef.current) {
      void playTextSegment(lastPlayedRef.current)
    }
  }, [playTextSegment])

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev
      isLoopingRef.current = next
      return next
    })
  }, [])

  const togglePhoneCallMode = useCallback(() => {
    setIsPhoneCallMode((prev) => {
      const next = !prev
      phoneCallModeRef.current = next
      return next
    })
  }, [])

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed)
    speedRef.current = speed
  }, [])

  const changeVoiceAccent = useCallback((accent: VoiceAccent) => {
    setVoiceAccent(accent)
    accentRef.current = accent
  }, [])

  useEffect(() => {
    return () => {
      clearLoopTimer()
      sharedTtsAudioEngine.stop()
    }
  }, [clearLoopTimer])

  return {
    isPlaying,
    isPlayingFullLesson,
    isLoadingAudio,
    audioError,
    usingFallbackSpeech,
    fallbackAccentMissing,
    playbackRate,
    isLooping,
    isPhoneCallMode,
    voiceAccent,
    playTextSegment,
    playFullLesson,
    stopAudio,
    replayLast,
    toggleLoop,
    togglePhoneCallMode,
    changeSpeed,
    changeVoiceAccent,
    setVoiceAccent,
    setIsPhoneCallMode,
  }
}
