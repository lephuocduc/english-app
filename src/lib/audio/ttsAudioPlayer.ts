import type { VoiceAccent } from '../../types'
import { apiClient } from '../api/client'
import { getSpeakerVoiceProfile } from './dialogueVoices'
import { pitchShiftAudioBuffer } from './voicePitchShift'

export interface PlayAudioSegmentOptions {
  text: string
  accent?: VoiceAccent
  speed?: number
  speakerIndex?: number
  leadInSpeakerIndex?: number
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

const FEMALE_VOICE_HINTS = [
  'female',
  'sonia',
  'libby',
  'serena',
  'martha',
  'hazel',
  'aria',
  'samantha',
  'zira',
  'karen',
  'natasha',
  'jenny',
  'ava',
  'emma',
]

const MALE_VOICE_HINTS = [
  'male',
  'ryan',
  'thomas',
  'daniel',
  'arthur',
  'george',
  'oliver',
  'guy',
  'david',
  'william',
  'james',
  'christopher',
  'andrew',
  'brian',
]

function detectVoiceGender(name: string): 'female' | 'male' | null {
  const lower = (name || '').toLowerCase()
  const hasFemale = FEMALE_VOICE_HINTS.some((h) => new RegExp(`(?:^|\\b)${h}(?:\\b|$)`).test(lower))
  const hasMale = MALE_VOICE_HINTS.some((h) => new RegExp(`(?:^|\\b)${h}(?:\\b|$)`).test(lower))
  if (hasFemale && !hasMale) return 'female'
  if (hasMale && !hasFemale) return 'male'
  return null
}

function selectBestSpeechVoice(
  voices: SpeechSynthesisVoice[],
  accent: VoiceAccent,
  speakerIndex = 0
): { voice: SpeechSynthesisVoice | null; exactMatch: boolean; matchedDistinctVoice: boolean } {
  if (!voices || voices.length === 0) {
    return { voice: null, exactMatch: false, matchedDistinctVoice: false }
  }

  const profile = getSpeakerVoiceProfile(speakerIndex)
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
    const gender = detectVoiceGender(lowerName)
    const genderBonus =
      gender === profile.preferredGender
        ? 200
        : gender && gender !== profile.preferredGender
          ? -80
          : 0
    return langBonus + genderBonus + (idx >= 0 ? 50 - idx : 0)
  }

  const matching = voices.filter((v) => {
    const lang = norm(v.lang || '')
    return lang === target || (lang.startsWith('en') && nameMatchesAccent(v.name || ''))
  })

  if (matching.length > 0) {
    matching.sort((a, b) => qualityScore(b) - qualityScore(a))
    const topVoice = matching[0]
    const topGender = detectVoiceGender(topVoice.name || '')
    let chosen = topVoice

    if (speakerIndex > 0 && topGender !== profile.preferredGender && matching.length > 1) {
      chosen = matching[speakerIndex % matching.length]
    }

    const chosenGender = detectVoiceGender(chosen.name || '')
    const matchedDistinctVoice =
      speakerIndex === 0 ||
      chosenGender === profile.preferredGender ||
      (chosenGender === null && matching.length > 1)

    return { voice: chosen, exactMatch: true, matchedDistinctVoice }
  }

  const fallbackPool = voices.filter((v) => norm(v.lang || '').startsWith('en'))
  if (fallbackPool.length > 0) {
    fallbackPool.sort((a, b) => qualityScore(b) - qualityScore(a))
    let chosen = fallbackPool[0]
    const topGender = detectVoiceGender(chosen.name || '')
    if (speakerIndex > 0 && topGender !== profile.preferredGender && fallbackPool.length > 1) {
      chosen = fallbackPool[speakerIndex % fallbackPool.length]
    }
    const chosenGender = detectVoiceGender(chosen.name || '')
    const matchedDistinctVoice =
      speakerIndex === 0 ||
      chosenGender === profile.preferredGender ||
      (chosenGender === null && fallbackPool.length > 1)

    return { voice: chosen, exactMatch: false, matchedDistinctVoice }
  }

  return { voice: null, exactMatch: false, matchedDistinctVoice: false }
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

  async fetchSegmentBuffer(
    text: string,
    accent: VoiceAccent = 'en-GB',
    speakerIndex = 0
  ): Promise<AudioBuffer> {
    const cleanText = text.trim()
    const profile = getSpeakerVoiceProfile(speakerIndex)
    const baseCacheKey = `${accent}:::${cleanText}`
    const targetCacheKey =
      profile.id === 'voice-a' ? baseCacheKey : `${accent}:::${profile.id}:::${cleanText}`

    const cachedTarget = bufferCache.get(targetCacheKey)
    if (cachedTarget) return cachedTarget

    const ctx = this.getAudioContext()
    if (!ctx) {
      throw new Error('Web Audio API is unavailable in this environment')
    }

    let baseBuffer = bufferCache.get(baseCacheKey)
    if (!baseBuffer) {
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

      baseBuffer = await ctx.decodeAudioData(arrayBuf)
      bufferCache.set(baseCacheKey, baseBuffer)
    }

    if (Math.abs(profile.pitchRatio - 1.0) >= 0.01) {
      const shifted = pitchShiftAudioBuffer(ctx, baseBuffer, profile.pitchRatio)
      bufferCache.set(targetCacheKey, shifted)
      return shifted
    }

    return baseBuffer
  }

  private connectWithSpeakerEq(
    ctx: AudioContext,
    src: AudioNode,
    target: AudioNode,
    speakerIndex = 0
  ): void {
    const profile = getSpeakerVoiceProfile(speakerIndex)
    if (profile.lowShelfGainDb === 0 && profile.highShelfGainDb === 0) {
      src.connect(target)
      return
    }

    const lowShelf = ctx.createBiquadFilter()
    lowShelf.type = 'lowshelf'
    lowShelf.frequency.value = 220
    lowShelf.gain.value = profile.lowShelfGainDb

    const highShelf = ctx.createBiquadFilter()
    highShelf.type = 'highshelf'
    highShelf.frequency.value = 3800
    highShelf.gain.value = profile.highShelfGainDb

    src.connect(lowShelf)
    lowShelf.connect(highShelf)
    highShelf.connect(target)
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
      speakerIndex = 0,
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

      const profile = getSpeakerVoiceProfile(speakerIndex)
      const { voice, exactMatch, matchedDistinctVoice } = selectBestSpeechVoice(
        voices,
        accent,
        speakerIndex
      )
      if (voice) {
        utterance.voice = voice
      }
      if (speakerIndex > 0 && !matchedDistinctVoice) {
        utterance.pitch = Math.min(1.25, Math.max(0.75, profile.pitchRatio))
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
      speakerIndex = 0,
      leadInSpeakerIndex,
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

      const effectiveLeadInSpeaker = leadInSpeakerIndex ?? speakerIndex
      const mainBufferPromise = this.fetchSegmentBuffer(cleanText, accent, speakerIndex)
      const leadInBufferPromise = leadInText?.trim()
        ? this.fetchSegmentBuffer(leadInText.trim(), accent, effectiveLeadInSpeaker).catch(
            () => null
          )
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
        this.connectWithSpeakerEq(ctx, leadInSrc, inputNode, effectiveLeadInSpeaker)

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
      this.connectWithSpeakerEq(ctx, mainSrc, inputNode, speakerIndex)
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
