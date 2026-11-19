import type { VoiceAccent } from '../../types'
import { apiClient } from '../api/client'

export interface PlayAudioSegmentOptions {
  text: string
  accent?: VoiceAccent
  speed?: number
  isPhoneCallMode?: boolean
  leadInText?: string
  loop?: boolean
  onStart?: () => void
  onEnd?: () => void
  onFallbackUsed?: (usedFallback: boolean, fallbackVoiceMatched?: boolean) => void
  onError?: (msg: string) => void
}

const HIGH_QUALITY_VOICE_HINTS = [
  'google',
  'natural',
  'online',
  'neural',
  'siri',
  'enhanced',
  'daniel',
  'serena',
  'karen',
  'samantha',
]

function selectBestSpeechVoice(
  voices: SpeechSynthesisVoice[],
  accent: VoiceAccent
): { voice: SpeechSynthesisVoice | null; exactMatch: boolean } {
  if (!voices || voices.length === 0) {
    return { voice: null, exactMatch: false }
  }

  const norm = (s: string) => s.replace(/_/g, '-').toLowerCase()
  const target = norm(accent)

  const nameMatchesAccent = (name: string): boolean => {
    if (accent === 'en-GB') return /(?:^|\b)(?:uk|british|great britain|united kingdom)(?:\b|$)/i.test(name)
    if (accent === 'en-AU') return /(?:^|\b)(?:au|australian|australia)(?:\b|$)/i.test(name)
    return /(?:^|\b)(?:us|u\.s\.|american|united states)(?:\b|$)/i.test(name)
  }

  const qualityScore = (v: SpeechSynthesisVoice): number => {
    const lowerName = (v.name || '').toLowerCase()
    const idx = HIGH_QUALITY_VOICE_HINTS.findIndex((hint) => lowerName.includes(hint))
    const langBonus = norm(v.lang) === target ? 100 : 0
    return langBonus + (idx >= 0 ? 50 - idx : 0)
  }

  const matching = voices.filter((v) => {
    const lang = norm(v.lang || '')
    return lang === target || (lang.startsWith('en') && nameMatchesAccent(v.name || ''))
  })

  if (matching.length > 0) {
    matching.sort((a, b) => qualityScore(b) - qualityScore(a))
    return { voice: matching[0], exactMatch: true }
  }

  const fallbackEn = voices.find((v) => norm(v.lang || '').startsWith('en')) || null
  return { voice: fallbackEn, exactMatch: false }
}

const bufferCache = new Map<string, AudioBuffer>()

function createPhoneDistortionCurve(amount = 16): Float32Array<ArrayBuffer> {
  const samples = 44100
  const curve = new Float32Array(new ArrayBuffer(samples * 4))
  const deg = Math.PI / 180
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

function createLineNoiseBuffer(ctx: AudioContext, durationSec = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100
  const length = Math.floor(sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    // Subtle pink-ish telephone line hiss
    data[i] = (Math.random() * 2 - 1) * 0.5
  }
  return buffer
}

export class TtsAudioEngine {
  private ctx: AudioContext | null = null
  private activeSource: AudioBufferSourceNode | null = null
  private leadInSource: AudioBufferSourceNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private outputGain: GainNode | null = null
  private playbackToken = 0
  private phoneCurve: Float32Array<ArrayBuffer> | null = null
  private lineNoiseBuffer: AudioBuffer | null = null

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    if (!this.ctx) {
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private createDestinationChain(
    ctx: AudioContext,
    isPhoneCallMode: boolean
  ): { inputNode: AudioNode; noiseTarget: AudioNode | null } {
    const masterGain = ctx.createGain()
    masterGain.gain.value = isPhoneCallMode ? 1.15 : 1.0
    masterGain.connect(ctx.destination)
    this.outputGain = masterGain

    if (!isPhoneCallMode) {
      return { inputNode: masterGain, noiseTarget: null }
    }

    // Authentic PSTN / Mobile Phone Call Bandpass DSP (320Hz - 3200Hz)
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 320
    highpass.Q.value = 0.85

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 3200
    lowpass.Q.value = 0.85

    const midResonance = ctx.createBiquadFilter()
    midResonance.type = 'peaking'
    midResonance.frequency.value = 1250
    midResonance.Q.value = 1.3
    midResonance.gain.value = 5.0

    const shaper = ctx.createWaveShaper()
    if (!this.phoneCurve) {
      this.phoneCurve = createPhoneDistortionCurve(14)
    }
    shaper.curve = this.phoneCurve
    shaper.oversample = '2x'

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -22
    compressor.knee.value = 15
    compressor.ratio.value = 6
    compressor.attack.value = 0.005
    compressor.release.value = 0.12

    highpass.connect(lowpass)
    lowpass.connect(midResonance)
    midResonance.connect(shaper)
    shaper.connect(compressor)
    compressor.connect(masterGain)

    return { inputNode: highpass, noiseTarget: highpass }
  }

  private startPhoneLineStatic(ctx: AudioContext, target: AudioNode): void {
    try {
      if (!this.lineNoiseBuffer) {
        this.lineNoiseBuffer = createLineNoiseBuffer(ctx, 2)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = this.lineNoiseBuffer
      noise.loop = true

      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.014

      noise.connect(noiseGain)
      noiseGain.connect(target)
      noise.start()
      this.noiseSource = noise
    } catch {
      // ignore if noise buffer fails
    }
  }

  async fetchSegmentBuffer(text: string, accent: VoiceAccent = 'en-GB'): Promise<AudioBuffer> {
    const cleanText = text.trim()
    const cacheKey = `${accent}:::${cleanText}`
    const cached = bufferCache.get(cacheKey)
    if (cached) return cached

    const ctx = this.getAudioContext()
    if (!ctx) {
      throw new Error('Web Audio API is unavailable in this environment')
    }

    const url = apiClient.getTtsAudioUrl(cleanText, accent)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`TTS HTTP ${response.status}`)
    }

    const contentType = (response.headers?.get?.('content-type') || '').toLowerCase()
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('TTS endpoint did not return audio')
    }

    const arrayBuf = await response.arrayBuffer()
    if (arrayBuf.byteLength < 64) {
      throw new Error('TTS returned empty audio data')
    }

    const decoded = await ctx.decodeAudioData(arrayBuf)
    bufferCache.set(cacheKey, decoded)
    return decoded
  }

  stop(): void {
    this.playbackToken += 1
    try {
      this.activeSource?.stop()
    } catch {
      // ignore already stopped
    }
    try {
      this.leadInSource?.stop()
    } catch {
      // ignore
    }
    try {
      this.noiseSource?.stop()
    } catch {
      // ignore
    }
    this.activeSource = null
    this.leadInSource = null
    this.noiseSource = null
    if (this.outputGain) {
      try {
        this.outputGain.disconnect()
      } catch {
        // ignore
      }
      this.outputGain = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
  }

  private getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
    const synth = window.speechSynthesis
    const current = synth.getVoices?.() || []
    if (current.length > 0 || typeof synth.addEventListener !== 'function') {
      return Promise.resolve(current)
    }

    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        synth.removeEventListener?.('voiceschanged', finish)
        window.clearTimeout(timer)
        resolve(synth.getVoices?.() || [])
      }
      const timer = window.setTimeout(finish, 250)
      synth.addEventListener('voiceschanged', finish)
    })
  }

  private async playWithSpeechSynthesisFallback(
    options: PlayAudioSegmentOptions,
    token: number
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false
    }

    const {
      text,
      accent = 'en-GB',
      speed = 1.0,
      isPhoneCallMode = false,
      onStart,
      onEnd,
      onFallbackUsed,
    } = options

    try {
      const voices = await this.getVoicesReady()
      if (this.playbackToken !== token) return false

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = accent
      utterance.rate = speed

      const { voice, exactMatch } = selectBestSpeechVoice(voices, accent)
      if (voice) {
        utterance.voice = voice
      }

      if (isPhoneCallMode) {
        const ctx = this.getAudioContext()
        if (ctx) {
          const { noiseTarget } = this.createDestinationChain(ctx, true)
          if (noiseTarget) this.startPhoneLineStatic(ctx, noiseTarget)
        }
      }

      utterance.onstart = () => {
        if (this.playbackToken !== token) return
        onFallbackUsed?.(true, exactMatch)
        onStart?.()
      }

      utterance.onend = () => {
        if (this.playbackToken !== token) return
        try {
          this.noiseSource?.stop()
        } catch {
          // ignore
        }
        this.noiseSource = null
        onEnd?.()
      }

      utterance.onerror = () => {
        if (this.playbackToken !== token) return
        try {
          this.noiseSource?.stop()
        } catch {
          // ignore
        }
        this.noiseSource = null
        onEnd?.()
      }

      onFallbackUsed?.(true, exactMatch)
      onStart?.()
      window.speechSynthesis.speak(utterance)
      return true
    } catch {
      return false
    }
  }

  async playSegment(options: PlayAudioSegmentOptions): Promise<void> {
    this.stop()
    const token = this.playbackToken

    const {
      text,
      accent = 'en-GB',
      speed = 1.0,
      isPhoneCallMode = false,
      leadInText,
      onStart,
      onEnd,
      onFallbackUsed,
      onError,
    } = options

    const cleanText = text.trim()
    if (!cleanText) {
      onEnd?.()
      return
    }

    try {
      const ctx = this.getAudioContext()
      if (!ctx) throw new Error('AudioContext unavailable')

      const mainBufferPromise = this.fetchSegmentBuffer(cleanText, accent)
      const leadInBufferPromise = leadInText?.trim()
        ? this.fetchSegmentBuffer(leadInText.trim(), accent).catch(() => null)
        : Promise.resolve(null)

      const [mainBuffer, leadInBuffer] = await Promise.all([
        mainBufferPromise,
        leadInBufferPromise,
      ])

      if (this.playbackToken !== token) return

      const { inputNode, noiseTarget } = this.createDestinationChain(ctx, isPhoneCallMode)
      if (isPhoneCallMode && noiseTarget) {
        this.startPhoneLineStatic(ctx, noiseTarget)
      }

      onFallbackUsed?.(false)
      onStart?.()

      const now = ctx.currentTime
      let mainStartAt = now

      // Optional 1.0s audio lead-in from the tail of the previous sentence buffer
      if (leadInBuffer && leadInBuffer.duration > 0.3) {
        const leadInSrc = ctx.createBufferSource()
        leadInSrc.buffer = leadInBuffer
        leadInSrc.playbackRate.value = speed
        leadInSrc.connect(inputNode)

        const sliceDuration = Math.min(1.1, leadInBuffer.duration)
        const offset = Math.max(0, leadInBuffer.duration - sliceDuration)
        leadInSrc.start(now, offset, sliceDuration)
        this.leadInSource = leadInSrc

        const realLeadDuration = sliceDuration / speed
        mainStartAt = now + realLeadDuration + 0.08
      }

      const mainSrc = ctx.createBufferSource()
      mainSrc.buffer = mainBuffer
      mainSrc.playbackRate.value = speed
      mainSrc.connect(inputNode)
      this.activeSource = mainSrc

      mainSrc.onended = () => {
        if (this.playbackToken !== token) return
        try {
          this.noiseSource?.stop()
        } catch {
          // ignore
        }
        this.noiseSource = null
        this.activeSource = null
        onEnd?.()
      }

      mainSrc.start(mainStartAt)
    } catch (err) {
      if (this.playbackToken !== token) return
      const fallbackStarted = await this.playWithSpeechSynthesisFallback(options, token)
      if (!fallbackStarted) {
        const message = err instanceof Error ? err.message : 'Unable to play synthesized audio'
        onError?.(message)
      }
    }
  }
}

export const sharedTtsAudioEngine = new TtsAudioEngine()
