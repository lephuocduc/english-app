import { useEffect, useRef, useState, useCallback } from 'react'

export interface YouTubePlayerHookOptions {
  containerId: string
  videoId: string
  initialSpeed?: number
  onSegmentEnd?: () => void
  onStateChange?: (state: number) => void
  onError?: (errorMessage: string) => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId?: string
          height?: string | number
          width?: string | number
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: (event: { target: any }) => void
            onStateChange?: (event: { data: number; target: any }) => void
            onError?: (event: { data: number; target: any }) => void
            onPlaybackRateChange?: (event: { data: number }) => void
          }
        }
      ) => any
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

/**
 * Loads the YouTube Iframe API script once globally with timeout and error handling
 */
export function loadYouTubeIframeApi(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    if (window.YT && window.YT.Player) {
      resolve()
      return
    }

    let timeoutId: number | null = null

    const cleanup = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const onReadyCallback = () => {
      cleanup()
      resolve()
    }

    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady()
      onReadyCallback()
    }

    const existingScript = document.getElementById('youtube-iframe-api-script') as HTMLScriptElement | null
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => {
        cleanup()
        reject(new Error('Lỗi tải YouTube IFrame API script'))
      }
      document.body.appendChild(tag)
    } else {
      existingScript.addEventListener(
        'error',
        () => {
          cleanup()
          reject(new Error('Lỗi tải YouTube IFrame API script'))
        },
        { once: true }
      )
    }

    timeoutId = window.setTimeout(() => {
      if (window.YT && window.YT.Player) {
        resolve()
      } else {
        reject(new Error('Thời gian tải YouTube IFrame API đã quá hạn'))
      }
    }, timeoutMs)
  })
}

export function useYouTubePlayer({
  containerId,
  videoId,
  initialSpeed = 1.0,
  onSegmentEnd,
  onStateChange,
  onError,
}: YouTubePlayerHookOptions) {
  const playerRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(initialSpeed)

  // Track active segment boundary
  const segmentBoundsRef = useRef<{ start: number; end: number; isSegmentPlay: boolean } | null>(null)
  const segmentWatchTimerRef = useRef<number | null>(null)
  const hasSettledRef = useRef(false)
  const pendingSegmentRef = useRef<{ start: number; end: number } | null>(null)

  // Clear monitoring loop
  const stopSegmentWatcher = useCallback(() => {
    if (segmentWatchTimerRef.current !== null) {
      window.clearInterval(segmentWatchTimerRef.current)
      segmentWatchTimerRef.current = null
    }
    hasSettledRef.current = false
    if (segmentBoundsRef.current) {
      segmentBoundsRef.current.isSegmentPlay = false
    }
  }, [])

  // Start monitoring loop to stop video exactly when segment endTime is reached
  // hasAlreadySettled can be true when resuming an already-positioned segment
  const startSegmentWatcher = useCallback(
    (startTime: number, endTime: number, hasAlreadySettled = false) => {
      stopSegmentWatcher()
      if (segmentBoundsRef.current) {
        segmentBoundsRef.current.isSegmentPlay = true
      }
      hasSettledRef.current = hasAlreadySettled

      segmentWatchTimerRef.current = window.setInterval(() => {
        const player = playerRef.current
        if (!player || typeof player.getCurrentTime !== 'function') return

        try {
          const currentTime = player.getCurrentTime()

          // Race condition prevention:
          // When seekTo is called, getCurrentTime() may momentarily return the old timestamp
          // from before the seek. We only consider the seek settled if currentTime is near the
          // start boundary or within the segment range [startTime - 0.75, endTime + 0.25].
          if (!hasSettledRef.current) {
            if (
              (currentTime >= startTime - 0.75 && currentTime <= endTime + 0.25) ||
              Math.abs(currentTime - startTime) <= 1.0
            ) {
              hasSettledRef.current = true
            }
          }

          // Once settled in the target segment, stop cleanly when reaching endTime
          if (hasSettledRef.current) {
            if (currentTime >= endTime - 0.02) {
              player.pauseVideo()
              stopSegmentWatcher()
              if (onSegmentEnd) {
                onSegmentEnd()
              }
            }
          }
        } catch {
          // ignore transient errors during buffering
        }
      }, 60)
    },
    [onSegmentEnd, stopSegmentWatcher]
  )

  // Playback control functions
  const playSegment = useCallback(
    (startTime: number, endTime: number) => {
      const player = playerRef.current
      if (!player || typeof player.seekTo !== 'function') {
        // Player not ready yet; save in pending ref for onReady execution
        pendingSegmentRef.current = { start: startTime, end: endTime }
        return
      }

      segmentBoundsRef.current = { start: startTime, end: endTime, isSegmentPlay: true }
      pendingSegmentRef.current = null

      try {
        player.seekTo(startTime, true)
        player.playVideo()
        startSegmentWatcher(startTime, endTime, false)
      } catch (err) {
        console.warn('Error during playSegment:', err)
      }
    },
    [startSegmentWatcher]
  )

  const replaySegment = useCallback(() => {
    if (segmentBoundsRef.current) {
      playSegment(segmentBoundsRef.current.start, segmentBoundsRef.current.end)
    }
  }, [playSegment])

  const pauseSegment = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    try {
      stopSegmentWatcher()
      if (typeof player.pauseVideo === 'function') {
        player.pauseVideo()
      }
    } catch {
      // ignore
    }
  }, [stopSegmentWatcher])

  const resumeSegment = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    try {
      if (typeof player.playVideo === 'function') {
        player.playVideo()
      }

      // If we have an active segment boundary, resume watching it so it stops at endTime
      if (segmentBoundsRef.current) {
        const { start, end } = segmentBoundsRef.current
        const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : start
        if (currentTime < end - 0.05) {
          startSegmentWatcher(start, end, true)
        } else {
          // If already past endTime, restart segment from beginning
          playSegment(start, end)
        }
      }
    } catch {
      // ignore
    }
  }, [playSegment, startSegmentWatcher])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseSegment()
    } else {
      resumeSegment()
    }
  }, [isPlaying, pauseSegment, resumeSegment])

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current
    if (!player || typeof player.seekTo !== 'function') return
    try {
      player.seekTo(seconds, true)
    } catch {
      // ignore
    }
  }, [])

  const changeSpeed = useCallback((speed: number) => {
    const player = playerRef.current
    if (!player) return
    try {
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(speed)
      }
      setPlaybackRate(speed)
    } catch {
      // ignore
    }
  }, [])

  const getCurrentTime = useCallback((): number => {
    const player = playerRef.current
    if (!player || typeof player.getCurrentTime !== 'function') return 0
    try {
      return Number(player.getCurrentTime()) || 0
    } catch {
      return 0
    }
  }, [])

  // Initialize player when videoId or containerId changes
  useEffect(() => {
    let isCancelled = false
    stopSegmentWatcher()

    if (!videoId) return

    loadYouTubeIframeApi().then(() => {
      if (isCancelled) return

      setIsReady(false)
      setPlayerError(null)
      setIsPlaying(false)

      // Destroy previous player instance if any
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }

      const container = document.getElementById(containerId)
      if (!container) return

      try {
        playerRef.current = new window.YT!.Player(containerId, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
            fs: 1,
            cc_load_policy: 1,
            cc_lang_pref: 'en',
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return
              setIsReady(true)
              try {
                event.target.setPlaybackRate(initialSpeed)
              } catch {
                // ignore
              }

              // If a playSegment was requested while player was initializing, trigger it now
              if (pendingSegmentRef.current) {
                const pending = pendingSegmentRef.current
                pendingSegmentRef.current = null
                playSegment(pending.start, pending.end)
              }
            },
            onStateChange: (event: any) => {
              if (isCancelled) return
              const state = event.data
              if (onStateChange) onStateChange(state)

              if (window.YT && state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true)
              } else {
                setIsPlaying(false)
              }

              // If paused or ended by user manually outside segment watcher, halt watcher
              if (window.YT && (state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.ENDED)) {
                if (segmentBoundsRef.current && !segmentBoundsRef.current.isSegmentPlay) {
                  stopSegmentWatcher()
                }
              }
            },
            onError: (event: any) => {
              if (isCancelled) return
              const code = event.data
              let msg = 'Đã xảy ra lỗi khi phát video YouTube.'

              if (code === 2) {
                msg = 'Tham số video không hợp lệ (mã video có thể bị lỗi cú pháp).'
              } else if (code === 5) {
                msg = 'Trình phát HTML5 gặp sự cố kết nối với YouTube.'
              } else if (code === 100) {
                msg = 'Không tìm thấy video này (video có thể đã bị xóa hoặc đặt chế độ riêng tư).'
              } else if (code === 101 || code === 150) {
                msg = 'Chủ sở hữu video đã vô hiệu hóa tính năng nhúng phát video trên website bên ngoài.'
              }

              setPlayerError(msg)
              if (onError) onError(msg)
            },
            onPlaybackRateChange: (event: any) => {
              if (isCancelled) return
              setPlaybackRate(event.data)
            },
          },
        })
      } catch (err) {
        console.error('Failed to create YT.Player:', err)
        setPlayerError('Không thể khởi tạo trình phát YouTube IFrame.')
      }
    }).catch((err) => {
      if (isCancelled) return
      const msg =
        'Không thể tải thư viện YouTube IFrame API. Vui lòng kiểm tra kết nối mạng hoặc tắt tiện ích chặn nội dung.'
      console.warn('[ListenFlow Player]', err)
      setPlayerError(msg)
      if (onError) onError(msg)
    })

    return () => {
      isCancelled = true
      stopSegmentWatcher()
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
    }
  }, [videoId, containerId, initialSpeed, stopSegmentWatcher, onStateChange, onError, playSegment])

  return {
    isReady,
    isPlaying,
    playerError,
    playbackRate,
    playSegment,
    pauseSegment,
    resumeSegment,
    replaySegment,
    togglePlayPause,
    seekTo,
    changeSpeed,
    getCurrentTime,
  }
}
