import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceAccent } from '../../types'
import { sharedTtsAudioEngine } from '../../lib/audio/ttsAudioPlayer'

export interface UseAudioLessonPlayerOptions {
  initialSpeed?: number
  initialPhoneCallMode?: boolean
  initialAccent?: VoiceAccent
}

export interface PlayAudioTextParams {
  text: string
  leadInText?: string
  accent?: VoiceAccent
}

export function useAudioLessonPlayer({
  initialSpeed = 1.0,
  initialPhoneCallMode = false,
  initialAccent = 'en-GB',
}: UseAudioLessonPlayerOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [usingFallbackSpeech, setUsingFallbackSpeech] = useState(false)
  const [fallbackAccentMissing, setFallbackAccentMissing] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<number>(initialSpeed)
  const [isLooping, setIsLooping] = useState(false)
  const [isPhoneCallMode, setIsPhoneCallMode] = useState(initialPhoneCallMode)
  const [voiceAccent, setVoiceAccent] = useState<VoiceAccent>(initialAccent)

  const speedRef = useRef(playbackRate)
  const isLoopingRef = useRef(isLooping)
  const phoneCallModeRef = useRef(isPhoneCallMode)
  const accentRef = useRef(voiceAccent)
  const lastPlayedRef = useRef<PlayAudioTextParams | null>(null)
  const loopTimerRef = useRef<number | null>(null)

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
  }, [])

  const stopAudio = useCallback(() => {
    clearLoopTimer()
    sharedTtsAudioEngine.stop()
    setIsPlaying(false)
    setIsLoadingAudio(false)
  }, [clearLoopTimer])

  const playTextSegment = useCallback(
    async (params: PlayAudioTextParams) => {
      clearLoopTimer()
      lastPlayedRef.current = {
        text: params.text,
        leadInText: params.leadInText,
      }
      setAudioError(null)
      setIsLoadingAudio(true)

      const runPlay = async (withLeadIn: boolean) => {
        await sharedTtsAudioEngine.playSegment({
          text: params.text,
          leadInText: withLeadIn ? params.leadInText : undefined,
          accent: withLeadIn && params.accent ? params.accent : accentRef.current,
          speed: speedRef.current,
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
    isLoadingAudio,
    audioError,
    usingFallbackSpeech,
    fallbackAccentMissing,
    playbackRate,
    isLooping,
    isPhoneCallMode,
    voiceAccent,
    playTextSegment,
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
