import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { pitchShiftChannel } from '../lib/audio/voicePitchShift'
import { buildLessonSpeakerMap } from '../lib/audio/dialogueVoices'
import { DEFAULT_B1_B2_AUDIO_LESSONS } from '../data/defaultAudioLessons'
import { createAudioLessonFromText, detectDialogueSpeakersInText } from '../lib/audio/textToLesson'
import { TtsAudioEngine } from '../lib/audio/ttsAudioPlayer'
import { AudioPlayerView } from '../features/audio/AudioPlayerView'
import { TextToAudioForm } from '../features/audio/TextToAudioForm'

function estimateZeroCrossingFrequency(samples: Float32Array, sampleRate: number): number {
  const start = Math.floor(samples.length * 0.05)
  const end = Math.floor(samples.length * 0.95)
  let crossings = 0
  for (let i = start + 1; i < end; i++) {
    if (samples[i - 1] < 0 && samples[i] >= 0) {
      crossings += 1
    }
  }
  return (crossings * sampleRate) / (end - start)
}

describe('Dialogue Multi-Speaker Voice Differentiation', () => {
  describe('1. WSOLA time-preserving pitch shifting', () => {
    it('shifts pitch down cleanly (0.80x) and up cleanly (1.11x) while preserving buffer length', () => {
      const sampleRate = 24000
      const length = 9600 // 0.4s
      const inputFreq = 200
      const input = new Float32Array(length)
      for (let i = 0; i < length; i++) {
        input[i] = Math.sin((2 * Math.PI * inputFreq * i) / sampleRate) * 0.6
      }

      const down = pitchShiftChannel(input, sampleRate, 0.8)
      expect(down.length).toBe(length)
      let downRms = 0
      for (let i = 0; i < down.length; i++) {
        expect(Number.isNaN(down[i])).toBe(false)
        expect(Math.abs(down[i])).toBeLessThanOrEqual(1)
        downRms += down[i] * down[i]
      }
      downRms = Math.sqrt(downRms / down.length)
      expect(downRms).toBeGreaterThan(0.1)

      const downFreq = estimateZeroCrossingFrequency(down, sampleRate)
      expect(downFreq).toBeGreaterThanOrEqual(145)
      expect(downFreq).toBeLessThanOrEqual(175)

      const up = pitchShiftChannel(input, sampleRate, 1.11)
      expect(up.length).toBe(length)
      const upFreq = estimateZeroCrossingFrequency(up, sampleRate)
      expect(upFreq).toBeGreaterThanOrEqual(205)
      expect(upFreq).toBeLessThanOrEqual(240)
    })
  })

  describe('2. Preset IT System Operations dialogue speaker detection', () => {
    it('detects 2+ distinct speakers on all 16 preset lessons and keeps consecutive turns on the same voice', () => {
      expect(DEFAULT_B1_B2_AUDIO_LESSONS).toHaveLength(16)

      for (const lesson of DEFAULT_B1_B2_AUDIO_LESSONS) {
        const info = buildLessonSpeakerMap(lesson.sentences)
        expect(info.isDialogue).toBe(true)
        expect(info.speakers.length).toBeGreaterThanOrEqual(2)
      }

      // Check A2-B1 Lesson 08 where [Infra] has consecutive turns at index 5 & 6
      const sslLesson = DEFAULT_B1_B2_AUDIO_LESSONS.find(
        (l) => l.id === 'lesson-audio-itops-a2-08'
      )!
      const sslMap = buildLessonSpeakerMap(sslLesson.sentences)
      const turn5 = sslMap.bySegmentId[sslLesson.sentences[4].id]
      const turn6 = sslMap.bySegmentId[sslLesson.sentences[5].id]
      const turn7 = sslMap.bySegmentId[sslLesson.sentences[6].id]

      expect(turn5.speaker).toBe('Helpdesk')
      expect(turn6.speaker).toBe('Infra')
      expect(turn7.speaker).toBe('Infra')
      expect(turn6.speakerIndex).toBe(turn7.speakerIndex)
      expect(turn5.speakerIndex).not.toBe(turn6.speakerIndex)
    })
  })

  describe('3. Custom dialogue parsing & D1 hint preservation', () => {
    it('strips Speaker: prefixes from dictated text and assigns alternating voice indices', () => {
      const raw = [
        'Alice: Hello, is server one online?',
        'Bob: Yes, CPU dropped to twenty percent.',
        'Alice: Great, thanks!',
      ].join('\n')

      expect(detectDialogueSpeakersInText(raw)).toEqual(['Alice', 'Bob'])

      const lesson = createAudioLessonFromText({
        title: 'Quick Ops Sync',
        rawText: raw,
      })

      expect(lesson.sentences).toHaveLength(3)
      expect(lesson.sentences[0].text).toBe('Hello, is server one online?')
      expect(lesson.sentences[0].speaker).toBe('Alice')
      expect(lesson.sentences[1].text).toBe('Yes, CPU dropped to twenty percent.')
      expect(lesson.sentences[1].speaker).toBe('Bob')
      expect(lesson.sentences[2].text).toBe('Great, thanks!')
      expect(lesson.sentences[2].speaker).toBe('Alice')

      // Simulate D1 round-trip where explicit `speaker` column doesn't exist and `hint` carries [Speaker: ...]
      const roundTripped = lesson.sentences.map(({ speaker: _omit, ...rest }) => rest)
      const speakerInfo = buildLessonSpeakerMap(roundTripped)
      expect(speakerInfo.isDialogue).toBe(true)
      expect(speakerInfo.speakers).toEqual(['Alice', 'Bob'])
      expect(speakerInfo.bySegmentId[roundTripped[0].id].speakerIndex).toBe(0)
      expect(speakerInfo.bySegmentId[roundTripped[1].id].speakerIndex).toBe(1)
      expect(speakerInfo.bySegmentId[roundTripped[2].id].speakerIndex).toBe(0)
    })
  })

  describe('4. Web Speech fallback distinct female/male voice selection', () => {
    it('picks Female voice for speakerIndex 0 and Male voice for speakerIndex 1', async () => {
      const prevFetch = globalThis.fetch
      const prevUtterance = globalThis.SpeechSynthesisUtterance
      const prevSpeechDescriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis')

      const spokenVoices: string[] = []
      class StubSpeechSynthesisUtterance {
        text: string
        lang = ''
        rate = 1
        pitch = 1
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
              { name: 'Google UK English Female', lang: 'en-GB' },
              { name: 'Google UK English Male', lang: 'en-GB' },
            ],
            cancel: vi.fn(),
            speak: vi.fn((u: any) => {
              spokenVoices.push(u.voice?.name || '')
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

        const engine = new TtsAudioEngine()
        await engine.playSegment({
          text: 'Turn zero message.',
          accent: 'en-GB',
          speakerIndex: 0,
        })
        await engine.playSegment({
          text: 'Turn one reply.',
          accent: 'en-GB',
          speakerIndex: 1,
        })

        expect(spokenVoices).toEqual(['Google UK English Female', 'Google UK English Male'])
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
  })

  describe('5. UI speaker indicators in AudioPlayerView & TextToAudioForm', () => {
    it('shows active speaker & voice badge on AudioPlayerView during dialogue playback', () => {
      render(
        <AudioPlayerView
          lessonTitle="01. High CPU Alert"
          isPlaying={false}
          isLoadingAudio={false}
          audioError={null}
          currentSpeed={1.0}
          voiceAccent="en-GB"
          activeSpeaker="SRE"
          activeSpeakerIndex={1}
          speakerCount={2}
          activeSegment={{
            id: 's2',
            startTime: 5,
            endTime: 10,
            text: 'Checking the monitoring dashboard now.',
          }}
          totalDurationSeconds={58}
          onPlaySegment={vi.fn()}
          onTogglePlayPause={vi.fn()}
          onChangeSpeed={vi.fn()}
        />
      )

      expect(screen.getByText(/Người nói:\s*SRE\s*•\s*Giọng B/i)).toBeInTheDocument()
    })

    it('detects and badges dialogue speakers live in TextToAudioForm', () => {
      render(<TextToAudioForm onCreateAudioLesson={vi.fn()} />)
      const textArea = screen.getByLabelText(/Nội dung đoạn văn tiếng Anh/i)

      fireEvent.change(textArea, {
        target: { value: 'Alice: Hi Bob.\nBob: Hello Alice.' },
      })

      expect(
        screen.getByText(/Hội thoại 2 vai \(Alice, Bob\)/i)
      ).toBeInTheDocument()
    })
  })
})
