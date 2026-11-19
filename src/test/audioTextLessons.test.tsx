import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import {
  splitTextIntoSentences,
  estimateAudioDurationSeconds,
  createAudioLessonFromText,
  isAudioLesson,
} from '../lib/audio/textToLesson'
import { TtsAudioEngine, sharedTtsAudioEngine } from '../lib/audio/ttsAudioPlayer'
import { useAudioLessonPlayer } from '../features/audio/useAudioLessonPlayer'
import {
  DEFAULT_B1_B2_AUDIO_LESSONS,
  RETIRED_PRESET_AUDIO_IDS,
} from '../data/defaultAudioLessons'
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

  describe('2. 10 IT System Operations B1-B2 Audio Conversations (~1 minute each)', () => {
    it('provides 10 complete IT Ops B1-B2 conversations with translations, hints, and ~1-minute duration', () => {
      expect(DEFAULT_B1_B2_AUDIO_LESSONS).toHaveLength(10)

      for (const lesson of DEFAULT_B1_B2_AUDIO_LESSONS) {
        expect(isAudioLesson(lesson)).toBe(true)
        expect(lesson.id).toMatch(/^lesson-audio-itops-\d{2}$/)
        expect(lesson.videoId).toMatch(/^audio-itops-\d{2}$/)
        expect(lesson.videoId.length).toBeLessThanOrEqual(32)
        expect(lesson.level).toBe('Intermediate')
        expect(lesson.sentences.length).toBeGreaterThanOrEqual(8)

        const totalDuration = lesson.sentences[lesson.sentences.length - 1].endTime
        // Each lesson targets ~1 minute (40s to 75s)
        expect(totalDuration).toBeGreaterThanOrEqual(40)
        expect(totalDuration).toBeLessThanOrEqual(75)

        for (const seg of lesson.sentences) {
          expect(seg.text.trim().length).toBeGreaterThan(10)
          expect(seg.translation?.trim().length).toBeGreaterThan(5)
          expect(seg.hint?.trim().length).toBeGreaterThan(2)
          expect(seg.endTime).toBeGreaterThan(seg.startTime)
        }
      }
    })

    it('retires legacy general-topic preset conversations from local storage', () => {
      for (let i = 1; i <= 10; i++) {
        const suffix = String(i).padStart(2, '0')
        expect(RETIRED_PRESET_AUDIO_IDS.has(`lesson-audio-b1b2-${suffix}`)).toBe(true)
        expect(RETIRED_PRESET_AUDIO_IDS.has(`audio-b1b2-${suffix}`)).toBe(true)
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
        DEFAULT_B1_B2_AUDIO_LESSONS[0],
      ])

      const loaded = storage.loadVideos() || []
      expect(loaded.some((v) => v.id === 'lesson-audio-b1b2-01')).toBe(false)
      expect(loaded.some((v) => v.id === 'lesson-audio-itops-01')).toBe(true)
      window.localStorage.clear()
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

      rerender(
        <AudioPlayerView
          lessonTitle="01. High CPU Alert & Memory Leak Triage (IT Ops)"
          level="Intermediate"
          isPlaying={true}
          isLoadingAudio={false}
          isLooping={false}
          isPhoneCallMode={true}
          hasLeadIn={true}
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
          onToggleLeadIn={vi.fn()}
          onChangeSpeed={vi.fn()}
          onChangeAccent={onChangeAccent}
        />
      )

      expect(screen.getByText('Phone Filter 320Hz–3.2kHz')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Phone Mode/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
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
        ;(globalThis as any).SpeechSynthesisUtterance = StubSpeechSynthesisUtterance
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
        ;(globalThis as any).SpeechSynthesisUtterance = prevUtterance
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
      expect(json.data[0].videoId).toBe('audio-itops-01')
      expect(json.data[0].sentences).toHaveLength(sampleAudio.sentences.length)
      expect(isAudioLesson(json.data[0])).toBe(true)
    })
  })
})
