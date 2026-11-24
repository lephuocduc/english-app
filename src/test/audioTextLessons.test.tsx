import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import {
  splitTextIntoSentences,
  estimateAudioDurationSeconds,
  createAudioLessonFromText,
  isAudioLesson,
} from '../lib/audio/textToLesson'
import {
  TtsAudioEngine,
  sharedTtsAudioEngine,
  audioBufferToWavBlob,
} from '../lib/audio/ttsAudioPlayer'
import { useAudioLessonPlayer } from '../features/audio/useAudioLessonPlayer'
import {
  DEFAULT_A2_B1_AUDIO_LESSONS,
  DEFAULT_B1_B2_AUDIO_LESSONS,
  RETIRED_PRESET_AUDIO_IDS,
} from '../data/defaultAudioLessons'
import { apiClient } from '../lib/api/client'
import { storage } from '../lib/storage/storage'
import { AudioPlayerView } from '../features/audio/AudioPlayerView'
import { TextToAudioForm } from '../features/audio/TextToAudioForm'
import { app as serverApp } from '../../server'
import { createTestD1Database } from '../../server/test/d1-sqlite'
import type { D1Database } from '../../server/types'

describe('Text-to-Audio Lesson Creator & Phone Call Mode', () => {
  describe('1. Text splitting and Audio Lesson generation', () => {
    it('splits prose cleanly into timed sentences while preserving abbreviations', () => {
      const prose =
        'Yesterday I met Mr. Johnson at the U.S. embassy. We discussed sustainable logistics! Would you consider joining?'
      const sentences = splitTextIntoSentences(prose)
      expect(sentences).toEqual([
        'Yesterday I met Mr. Johnson at the U.S. embassy.',
        'We discussed sustainable logistics!',
        'Would you consider joining?',
      ])
    })

    it('creates a valid D1-compatible audio lesson from user text', () => {
      const text =
        'Consistent performance depends on sustainable habits. Taking brief pauses prevents mental fatigue during busy afternoons.'
      const lesson = createAudioLessonFromText({
        title: 'Sustainable Habits',
        rawText: text,
        level: 'Intermediate',
        voiceAccent: 'en-GB',
      })

      expect(isAudioLesson(lesson)).toBe(true)
      expect(lesson.sourceType).toBe('audio')
      expect(lesson.voiceAccent).toBe('en-GB')
      expect(lesson.videoId.length).toBeLessThanOrEqual(32)
      expect(lesson.sentences).toHaveLength(2)
      expect(lesson.sentences[0].startTime).toBe(0)
      expect(lesson.sentences[1].startTime).toBe(lesson.sentences[0].endTime)
      expect(estimateAudioDurationSeconds(text)).toBeGreaterThan(5)
    })
  })

  describe('2. 22 IT System Operations Audio Conversations (12 A2-B1 ~1m + 10 B1 ~2m)', () => {
    it('provides 12 A2-B1 (~1m) and 10 B1 (~2m) UK-default IT Ops conversations with translations and hints', () => {
      expect(DEFAULT_A2_B1_AUDIO_LESSONS).toHaveLength(12)
      for (const lesson of DEFAULT_A2_B1_AUDIO_LESSONS) {
        expect(lesson.level).toBe('Beginner')
        expect(lesson.id).toMatch(/^lesson-audio-itops-a2-\d{2}$/)
        expect(lesson.videoId).toMatch(/^audio-itops-a2-\d{2}$/)
        expect(lesson.voiceAccent).toBe('en-GB')
        const totalDuration = lesson.sentences[lesson.sentences.length - 1].endTime
        expect(totalDuration).toBeGreaterThanOrEqual(40)
        expect(totalDuration).toBeLessThanOrEqual(75)
      }

      expect(DEFAULT_B1_B2_AUDIO_LESSONS).toHaveLength(22)
      const b1Lessons = DEFAULT_B1_B2_AUDIO_LESSONS.filter((l) => l.level === 'Intermediate')
      expect(b1Lessons).toHaveLength(10)

      for (const lesson of b1Lessons) {
        expect(lesson.id).toMatch(/^lesson-audio-itops-b1-\d{2}$/)
        expect(lesson.videoId).toMatch(/^audio-itops-b1-\d{2}$/)
        expect(lesson.sentences.length).toBeGreaterThanOrEqual(16)
        const totalDuration = lesson.sentences[lesson.sentences.length - 1].endTime
        // Each new B1 lesson targets ~2 minutes (95s to 150s)
        expect(totalDuration).toBeGreaterThanOrEqual(95)
        expect(totalDuration).toBeLessThanOrEqual(150)
      }

      for (const lesson of DEFAULT_B1_B2_AUDIO_LESSONS) {
        expect(isAudioLesson(lesson)).toBe(true)
        expect(lesson.videoId.length).toBeLessThanOrEqual(32)
        expect(lesson.voiceAccent).toBe('en-GB')
        expect(['Beginner', 'Intermediate']).toContain(lesson.level)
        expect(lesson.sentences.length).toBeGreaterThanOrEqual(8)

        for (const seg of lesson.sentences) {
          expect(seg.text.trim().length).toBeGreaterThan(10)
          expect(seg.translation?.trim().length).toBeGreaterThan(5)
          expect(seg.hint?.trim().length).toBeGreaterThan(2)
          expect(seg.endTime).toBeGreaterThan(seg.startTime)
        }
      }
    })

    it('uses UK English (en-GB), Phone Mode on, Loop on, and +1s lead-in off as default preferences and player state', () => {
      window.localStorage.clear()
      const prefs = storage.loadPreferences()
      expect(prefs.ttsAccent).toBe('en-GB')
      expect(prefs.hasAudioLeadIn).toBe(false)
      expect(prefs.isPhoneCallMode).toBe(true)
      expect(prefs.isLooping).toBe(true)

      const customLesson = createAudioLessonFromText({
        title: 'Quick UK Default Check',
        rawText: 'First sentence for testing. Second sentence for testing.',
      })
      expect(customLesson.voiceAccent).toBe('en-GB')
      expect(apiClient.getTtsAudioUrl('hello')).toContain('lang=en-GB')

      const { result } = renderHook(() => useAudioLessonPlayer())
      expect(result.current.voiceAccent).toBe('en-GB')
      expect(result.current.isPhoneCallMode).toBe(true)
      expect(result.current.isLooping).toBe(true)
    })

    it('retires legacy general-topic and old B1-B2 IT Ops preset conversations from local storage', () => {
      for (let i = 1; i <= 10; i++) {
        const suffix = String(i).padStart(2, '0')
        expect(RETIRED_PRESET_AUDIO_IDS.has(`lesson-audio-b1b2-${suffix}`)).toBe(true)
        expect(RETIRED_PRESET_AUDIO_IDS.has(`audio-b1b2-${suffix}`)).toBe(true)
        expect(RETIRED_PRESET_AUDIO_IDS.has(`lesson-audio-itops-${suffix}`)).toBe(true)
        expect(RETIRED_PRESET_AUDIO_IDS.has(`audio-itops-${suffix}`)).toBe(true)
      }

      storage.saveVideos([
        {
          id: 'lesson-audio-b1b2-01',
          videoId: 'audio-b1b2-01',
          sourceType: 'audio',
          title: 'Legacy Lesson',
          language: 'en',
          sentences: [
            { id: 'legacy-seg-1', startTime: 0, endTime: 4, text: 'Legacy sentence.' },
          ],
        },
        {
          id: 'lesson-audio-itops-01',
          videoId: 'audio-itops-01',
          sourceType: 'audio',
          title: 'Retired B1-B2 Lesson',
          language: 'en',
          sentences: [
            { id: 'old-b1b2-seg-1', startTime: 0, endTime: 4, text: 'Retired B1-B2 sentence.' },
          ],
        },
        DEFAULT_A2_B1_AUDIO_LESSONS[0],
      ])

      const loaded = storage.loadVideos() || []
      expect(loaded.some((v) => v.id === 'lesson-audio-b1b2-01')).toBe(false)
      expect(loaded.some((v) => v.id === 'lesson-audio-itops-01')).toBe(false)
      expect(loaded.some((v) => v.id === DEFAULT_A2_B1_AUDIO_LESSONS[0].id)).toBe(true)
      window.localStorage.clear()
    })

    it('plays all sentences sequentially once via playFullLesson in useAudioLessonPlayer', async () => {
      vi.useFakeTimers()
      const playedTexts: string[] = []
      const segmentChanges: number[] = []
      const onComplete = vi.fn()

      const playSpy = vi
        .spyOn(sharedTtsAudioEngine, 'playSegment')
        .mockImplementation(async (opts) => {
          playedTexts.push(opts.text)
          opts.onStart?.()
          opts.onEnd?.()
        })

      try {
        const { result } = renderHook(() => useAudioLessonPlayer({ initialAccent: 'en-GB' }))

        await act(async () => {
          await result.current.playFullLesson(
            [
              { text: 'First sentence.', speakerIndex: 0 },
              { text: 'Second sentence.', speakerIndex: 1 },
              { text: 'Third sentence.', speakerIndex: 0 },
            ],
            {
              onSegmentChange: (idx) => segmentChanges.push(idx),
              onComplete,
            }
          )
          await vi.advanceTimersByTimeAsync(1000)
        })

        expect(playedTexts).toEqual(['First sentence.', 'Second sentence.', 'Third sentence.'])
        expect(segmentChanges).toEqual([0, 1, 2])
        expect(onComplete).toHaveBeenCalledTimes(1)
        expect(result.current.isPlayingFullLesson).toBe(false)
      } finally {
        playSpy.mockRestore()
        vi.useRealTimers()
      }
    })
  })

  describe('3. AudioPlayerView & Phone Call Mode UI', () => {
    it('renders AudioPlayerView and toggles Phone Call Challenge Mode & accents', () => {
      const onTogglePhoneCallMode = vi.fn()
      const onChangeAccent = vi.fn()
      const onPlaySegment = vi.fn()

      const { rerender } = render(
        <AudioPlayerView
          lessonTitle="01. High CPU Alert & Memory Leak Triage (IT Ops)"
          level="Intermediate"
          isPlaying={false}
          isLoadingAudio={false}
          isLooping={false}
          isPhoneCallMode={false}
          hasLeadIn={true}
          audioError={null}
          currentSpeed={1.0}
          voiceAccent="en-US"
          activeSegment={{
            id: 's1',
            startTime: 0,
            endTime: 5.5,
            text: 'Last Tuesday, my phone vibrated.',
          }}
          totalDurationSeconds={52}
          onPlaySegment={onPlaySegment}
          onTogglePlayPause={vi.fn()}
          onToggleLoop={vi.fn()}
          onTogglePhoneCallMode={onTogglePhoneCallMode}
          onToggleLeadIn={vi.fn()}
          onChangeSpeed={vi.fn()}
          onChangeAccent={onChangeAccent}
        />
      )

      expect(screen.getByText('Studio Clear Audio')).toBeInTheDocument()

      const phoneBtn = screen.getByRole('button', { name: /Phone Mode/i })
      expect(phoneBtn).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(phoneBtn)
      expect(onTogglePhoneCallMode).toHaveBeenCalledTimes(1)

      const usBtn = screen.getByRole('button', { name: 'US' })
      const ukBtn = screen.getByRole('button', { name: 'UK' })
      expect(usBtn).toHaveAttribute('aria-pressed', 'true')
      expect(ukBtn).toHaveAttribute('aria-pressed', 'false')

      fireEvent.click(ukBtn)
      expect(onChangeAccent).toHaveBeenCalledWith('en-GB')

      const onChangePhoneCallLevel = vi.fn()
      rerender(
        <AudioPlayerView
          lessonTitle="01. High CPU Alert & Memory Leak Triage (IT Ops)"
          level="Intermediate"
          isPlaying={true}
          isLoadingAudio={false}
          isLooping={false}
          isPhoneCallMode={true}
          phoneCallLevel={1}
          usingFallbackSpeech={true}
          fallbackAccentMissing={true}
          audioError={null}
          currentSpeed={1.0}
          voiceAccent="en-GB"
          activeSegment={{
            id: 's1',
            startTime: 0,
            endTime: 5.5,
            text: 'Last Tuesday, my phone vibrated.',
          }}
          totalDurationSeconds={52}
          onPlaySegment={onPlaySegment}
          onTogglePlayPause={vi.fn()}
          onToggleLoop={vi.fn()}
          onTogglePhoneCallMode={onTogglePhoneCallMode}
          onChangePhoneCallLevel={onChangePhoneCallLevel}
          onChangeSpeed={vi.fn()}
          onChangeAccent={onChangeAccent}
        />
      )

      expect(screen.getByText(/Phone Lv 1 • 320Hz–3\.2kHz/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Phone Mode/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      fireEvent.click(screen.getByRole('button', { name: /^Lv 2$/i }))
      expect(onChangePhoneCallLevel).toHaveBeenCalledWith(2)
      fireEvent.click(screen.getByRole('button', { name: /^Lv 3$/i }))
      expect(onChangePhoneCallLevel).toHaveBeenCalledWith(3)
      expect(screen.getByRole('button', { name: 'UK' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'US' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText(/Browser Voice \(thiếu giọng UK — cần \/api\/tts\)/i)).toBeInTheDocument()
    })

    it('matches en_GB browser speech synthesis voice when /api/tts falls back', async () => {
      const prevFetch = globalThis.fetch
      const prevUtterance = globalThis.SpeechSynthesisUtterance
      const prevSpeechDescriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis')

      let spokenUtterance: any = null
      class StubSpeechSynthesisUtterance {
        text: string
        lang = ''
        rate = 1
        voice: any = null
        onstart: (() => void) | null = null
        onend: (() => void) | null = null
        onerror: (() => void) | null = null
        constructor(text: string) {
          this.text = text
        }
      }

      try {
        ; (globalThis as any).SpeechSynthesisUtterance = StubSpeechSynthesisUtterance
        Object.defineProperty(window, 'speechSynthesis', {
          configurable: true,
          writable: true,
          value: {
            getVoices: () => [
              { name: 'Microsoft David', lang: 'en-US' },
              { name: 'Google UK English Female', lang: 'en_GB' },
            ],
            cancel: vi.fn(),
            speak: vi.fn((u: any) => {
              spokenUtterance = u
              u.onstart?.()
              u.onend?.()
            }),
          },
        })

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'application/json' }),
        }) as unknown as typeof fetch

        const onFallbackUsed = vi.fn()
        const engine = new TtsAudioEngine()
        await engine.playSegment({
          text: 'Hello server.',
          accent: 'en-GB',
          onFallbackUsed,
        })

        expect(spokenUtterance).not.toBeNull()
        expect(spokenUtterance.lang).toBe('en-GB')
        expect(spokenUtterance.voice?.name).toBe('Google UK English Female')
        expect(onFallbackUsed).toHaveBeenCalledWith(true, true)
      } finally {
        globalThis.fetch = prevFetch
          ; (globalThis as any).SpeechSynthesisUtterance = prevUtterance
        if (prevSpeechDescriptor) {
          Object.defineProperty(window, 'speechSynthesis', prevSpeechDescriptor)
        } else {
          delete (window as any).speechSynthesis
        }
      }
    })

    it('updates live accent ref in useAudioLessonPlayer before subsequent playback', async () => {
      const playSpy = vi
        .spyOn(sharedTtsAudioEngine, 'playSegment')
        .mockImplementation(async (opts) => {
          opts.onStart?.()
          opts.onEnd?.()
        })

      try {
        const { result } = renderHook(() => useAudioLessonPlayer({ initialAccent: 'en-US' }))
        expect(result.current.voiceAccent).toBe('en-US')

        act(() => {
          result.current.changeVoiceAccent('en-GB')
        })
        expect(result.current.voiceAccent).toBe('en-GB')

        await act(async () => {
          await result.current.playTextSegment({ text: 'Hello.' })
        })

        expect(playSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Hello.',
            accent: 'en-GB',
          })
        )
      } finally {
        playSpy.mockRestore()
      }
    })

    it('encodes an AudioBuffer into a valid PCM WAV Blob for mobile HTMLAudioElement playback', async () => {
      const sampleData = new Float32Array([0, 0.5, -0.5, 1.0, -1.0])
      const fakeBuffer = {
        numberOfChannels: 1,
        sampleRate: 24000,
        length: sampleData.length,
        duration: sampleData.length / 24000,
        getChannelData: () => sampleData,
      } as unknown as AudioBuffer

      const wavBlob = audioBufferToWavBlob(fakeBuffer)
      expect(wavBlob.type).toBe('audio/wav')
      expect(wavBlob.size).toBe(44 + sampleData.length * 2)

      const bytes = new Uint8Array(await wavBlob.arrayBuffer())
      const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
      const waveTag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
      expect(header).toBe('RIFF')
      expect(waveTag).toBe('WAVE')
    })

    it('reuses a single pre-unlocked HTMLAudioElement on mobile browsers', async () => {
      const prevUa = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent')
      const prevAudio = globalThis.Audio
      const prevFetch = globalThis.fetch
      const prevCreateObjectURL = URL.createObjectURL
      const prevRevokeObjectURL = URL.revokeObjectURL

      const createdAudioInstances: any[] = []
      class StubAudio {
        src = ''
        preload = ''
        muted = false
        volume = 1
        playbackRate = 1
        currentTime = 0
        onended: (() => void) | null = null
        onerror: (() => void) | null = null
        playCalls: string[] = []
        constructor() {
          createdAudioInstances.push(this)
        }
        setAttribute() {}
        pause() {}
        play() {
          this.playCalls.push(this.src)
          if (this.src.startsWith('blob:') && this.onended) {
            this.onended()
          }
          return Promise.resolve()
        }
      }

      try {
        Object.defineProperty(window.navigator, 'userAgent', {
          configurable: true,
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        })
        ;(globalThis as any).Audio = StubAudio
        URL.createObjectURL = vi.fn(() => 'blob:mock-mobile-audio')
        URL.revokeObjectURL = vi.fn()
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'audio/mpeg' }),
          blob: async () => new Blob([new Uint8Array(128)], { type: 'audio/mpeg' }),
          arrayBuffer: async () => new ArrayBuffer(128),
        }) as unknown as typeof fetch

        const onStart = vi.fn()
        const onEnd = vi.fn()
        const engine = new TtsAudioEngine()
        await engine.playSegment({
          text: 'Mobile playback verification sentence.',
          accent: 'en-GB',
          onStart,
          onEnd,
        })

        // Exactly ONE persistent HTMLAudioElement is created and reused (unlocked with silent WAV, then played)
        expect(createdAudioInstances).toHaveLength(1)
        expect(createdAudioInstances[0].playCalls[0]).toMatch(/^data:audio\/wav;base64,/)
        expect(createdAudioInstances[0].playCalls).toContain('blob:mock-mobile-audio')
        expect(onStart).toHaveBeenCalledTimes(1)
        expect(onEnd).toHaveBeenCalledTimes(1)
      } finally {
        if (prevUa) {
          Object.defineProperty(window.navigator, 'userAgent', prevUa)
        }
        ;(globalThis as any).Audio = prevAudio
        globalThis.fetch = prevFetch
        URL.createObjectURL = prevCreateObjectURL
        URL.revokeObjectURL = prevRevokeObjectURL
      }
    })
  })

  describe('4. TextToAudioForm UI', () => {
    it('creates an audio lesson when submitting custom text', () => {
      const onCreateAudioLesson = vi.fn()
      render(<TextToAudioForm onCreateAudioLesson={onCreateAudioLesson} />)

      const titleInput = screen.getByLabelText(/Tiêu đề bài nghe/i)
      const textArea = screen.getByLabelText(/Nội dung đoạn văn tiếng Anh/i)

      fireEvent.change(titleInput, { target: { value: 'Coffee Shop Chat' } })
      fireEvent.change(textArea, {
        target: {
          value:
            'Could I grab an oat flat white please? Sure, it will be ready in a minute.',
        },
      })

      expect(screen.getByText('2 câu')).toBeInTheDocument()

      const submitBtn = screen.getByRole('button', { name: /Tạo Audio & Lưu Database/i })
      fireEvent.click(submitBtn)

      expect(onCreateAudioLesson).toHaveBeenCalledTimes(1)
      const created = onCreateAudioLesson.mock.calls[0][0]
      expect(created.title).toBe('Coffee Shop Chat')
      expect(isAudioLesson(created)).toBe(true)
      expect(created.sentences).toHaveLength(2)
    })
  })

  describe('5. Backend D1 persistence & TTS endpoint validation', () => {
    let db: D1Database

    beforeEach(() => {
      db = createTestD1Database(false)
    })

    it('rejects empty text on /api/tts with 400 and persists created audio lessons in D1', async () => {
      const ttsBad = await serverApp.request('/api/tts?text=', { method: 'GET' }, { DB: db })
      expect(ttsBad.status).toBe(400)

      // Verify Cloudflare Workers AI Deepgram Aura-2 selects authentic British / US / AU speakers per speaker slot
      const aiCalls: Array<{ model: string; input: Record<string, unknown> }> = []
      const fakeAi = {
        run: vi.fn(async (model: string, input: Record<string, unknown>) => {
          aiCalls.push({ model, input })
          return new Response(new Uint8Array(128), {
            status: 200,
            headers: { 'content-type': 'audio/mpeg' },
          })
        }),
      }
      const ukSpk0 = await serverApp.request(
        '/api/tts?text=Check+the+server+schedule&lang=en-GB&speaker=0',
        { method: 'GET' },
        { DB: db, AI: fakeAi }
      )
      expect(ukSpk0.status).toBe(200)
      expect(ukSpk0.headers.get('x-tts-provider')).toBe('cloudflare-aura-2')
      expect(ukSpk0.headers.get('x-tts-speaker')).toBe('draco')
      expect(ukSpk0.headers.get('x-tts-distinct-voice')).toBe('1')

      const ukSpk1 = await serverApp.request(
        '/api/tts?text=Right+away&lang=en-GB&speaker=1',
        { method: 'GET' },
        { DB: db, AI: fakeAi }
      )
      expect(ukSpk1.headers.get('x-tts-speaker')).toBe('pandora')

      const usSpk0 = await serverApp.request(
        '/api/tts?text=Checking+now&lang=en-US&speaker=0',
        { method: 'GET' },
        { DB: db, AI: fakeAi }
      )
      expect(usSpk0.headers.get('x-tts-speaker')).toBe('orion')
      expect(aiCalls[0].model).toBe('@cf/deepgram/aura-2-en')

      const sampleAudio = DEFAULT_B1_B2_AUDIO_LESSONS[0]
      const createRes = await serverApp.request(
        '/api/lessons',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-user-id': 'owner',
          },
          body: JSON.stringify(sampleAudio),
        },
        { DB: db }
      )
      expect(createRes.status).toBe(201)

      const listRes = await serverApp.request(
        '/api/lessons',
        {
          method: 'GET',
          headers: { 'x-user-id': 'owner' },
        },
        { DB: db }
      )
      expect(listRes.status).toBe(200)
      const json = (await listRes.json()) as { success: boolean; data: any[] }
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].videoId).toBe(sampleAudio.videoId)
      expect(json.data[0].sentences).toHaveLength(sampleAudio.sentences.length)
      expect(isAudioLesson(json.data[0])).toBe(true)
    })
  })
})
