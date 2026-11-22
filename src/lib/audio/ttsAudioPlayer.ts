import type { PhoneCallLevel, VoiceAccent } from '../../types'
import { apiClient } from '../api/client'
import { getSpeakerVoiceProfile } from './dialogueVoices'
import { pitchShiftAudioBuffer, timeStretchAudioBuffer } from './voicePitchShift'

export interface PlayAudioSegmentOptions {
  text: string
  accent?: VoiceAccent
  speed?: number
  speakerIndex?: number
  leadInSpeakerIndex?: number
  isPhoneCallMode?: boolean
  phoneCallLevel?: PhoneCallLevel
  leadInText?: string
  loop?: boolean
  onStart?: () => void
  onEnd?: () => void
  onFallbackUsed?: (usedFallback: boolean, fallbackVoiceMatched?: boolean) => void
  onError?: (msg: string) => void
}

export interface PhoneModePreset {
  level: PhoneCallLevel
  label: string
  shortLabel: string
  bandLabel: string
  highpassHz: number
  lowpassHz: number
  midFreqHz: number
  midGainDb: number
  distortion: number
  noiseGain: number
  compressorThreshold: number
  compressorRatio: number
  masterGain: number
  wobbleHz: number
  wobbleDepth: number
}

export const PHONE_MODE_PRESETS: Record<PhoneCallLevel, PhoneModePreset> = {
  1: {
    level: 1,
    label: 'Mức 1 (Tiêu chuẩn)',
    shortLabel: 'Lv 1',
    bandLabel: '320Hz–3.2kHz',
    highpassHz: 320,
    lowpassHz: 3200,
    midFreqHz: 1250,
    midGainDb: 5.0,
    distortion: 14,
    noiseGain: 0.014,
    compressorThreshold: -22,
    compressorRatio: 6,
    masterGain: 1.15,
    wobbleHz: 0,
    wobbleDepth: 0,
  },
  2: {
    level: 2,
    label: 'Mức 2 (Sóng yếu)',
    shortLabel: 'Lv 2',
    bandLabel: '420Hz–2.5kHz',
    highpassHz: 420,
    lowpassHz: 2500,
    midFreqHz: 1350,
    midGainDb: 6.5,
    distortion: 28,
    noiseGain: 0.036,
    compressorThreshold: -26,
    compressorRatio: 9,
    masterGain: 1.25,
    wobbleHz: 3.5,
    wobbleDepth: 0.14,
  },
  3: {
    level: 3,
    label: 'Mức 3 (Chập chờn)',
    shortLabel: 'Lv 3',
    bandLabel: '520Hz–2.0kHz',
    highpassHz: 520,
    lowpassHz: 2050,
    midFreqHz: 1450,
    midGainDb: 8.0,
    distortion: 48,
    noiseGain: 0.068,
    compressorThreshold: -30,
    compressorRatio: 12,
    masterGain: 1.35,
    wobbleHz: 5.5,
    wobbleDepth: 0.28,
  },
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
const rawBlobCache = new Map<string, Blob>()

function decodeAudioDataCompat(ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const copy = arrayBuffer.slice(0)
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = ctx.decodeAudioData(
        copy,
        (decoded) => resolve(decoded),
        (err) => reject(err || new Error('decodeAudioData failed'))
      )
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve, reject)
      }
    } catch (err) {
      reject(err)
    }
  })
}

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
    data[i] = (Math.random() * 2 - 1) * 0.5
  }
  return buffer
}

export class TtsAudioEngine {
  private ctx: AudioContext | null = null
  private activeSource: AudioBufferSourceNode | null = null
  private leadInSource: AudioBufferSourceNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private wobbleOsc: OscillatorNode | null = null
  private activeHtmlAudio: HTMLAudioElement | null = null
  private activeBlobUrl: string | null = null
  private outputGain: GainNode | null = null
  private playbackToken = 0
  private phoneCurves = new Map<number, Float32Array<ArrayBuffer>>()
  private lineNoiseBuffer: AudioBuffer | null = null
  private isUnlocked = false
  private unlockListenersBound = false

  constructor() {
    this.bindMobileUnlockListeners()
  }

  private bindMobileUnlockListeners(): void {
    if (this.unlockListenersBound || typeof window === 'undefined') return
    this.unlockListenersBound = true
    const handleGesture = () => {
      this.unlockAudio()
      if (this.isUnlocked) {
        window.removeEventListener('touchstart', handleGesture)
        window.removeEventListener('pointerdown', handleGesture)
        window.removeEventListener('click', handleGesture)
      }
    }
    window.addEventListener('touchstart', handleGesture, { passive: true })
    window.addEventListener('pointerdown', handleGesture, { passive: true })
    window.addEventListener('click', handleGesture, { passive: true })
  }

  unlockAudio(): AudioContext | null {
    const ctx = this.getAudioContext()
    if (!ctx) return null
    try {
      if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
        void ctx.resume().catch(() => {})
      }
      if (
        !this.isUnlocked &&
        typeof ctx.createBuffer === 'function' &&
        typeof ctx.createBufferSource === 'function'
      ) {
        const silentBuf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = silentBuf
        src.connect(ctx.destination)
        src.start(0)
        this.isUnlocked = true
      }
    } catch {
      // ignore unlock errors
    }
    return ctx
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx()
      this.isUnlocked = false
    }
    if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
      void this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private createDestinationChain(
    ctx: AudioContext,
    isPhoneCallMode: boolean,
    phoneCallLevel: PhoneCallLevel = 1
  ): { inputNode: AudioNode; noiseTarget: AudioNode | null; preset: PhoneModePreset } {
    const preset = PHONE_MODE_PRESETS[phoneCallLevel] || PHONE_MODE_PRESETS[1]
    const masterGain = ctx.createGain()
    masterGain.gain.value = isPhoneCallMode ? preset.masterGain : 1.0
    masterGain.connect(ctx.destination)
    this.outputGain = masterGain

    if (!isPhoneCallMode) {
      return { inputNode: masterGain, noiseTarget: null, preset }
    }

    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = preset.highpassHz
    highpass.Q.value = 0.85

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = preset.lowpassHz
    lowpass.Q.value = 0.85

    const midResonance = ctx.createBiquadFilter()
    midResonance.type = 'peaking'
    midResonance.frequency.value = preset.midFreqHz
    midResonance.Q.value = 1.3
    midResonance.gain.value = preset.midGainDb

    const shaper = ctx.createWaveShaper()
    let curve = this.phoneCurves.get(preset.distortion)
    if (!curve) {
      curve = createPhoneDistortionCurve(preset.distortion)
      this.phoneCurves.set(preset.distortion, curve)
    }
    shaper.curve = curve
    shaper.oversample = '2x'

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = preset.compressorThreshold
    compressor.knee.value = 15
    compressor.ratio.value = preset.compressorRatio
    compressor.attack.value = 0.005
    compressor.release.value = 0.12

    highpass.connect(lowpass)
    lowpass.connect(midResonance)
    midResonance.connect(shaper)
    shaper.connect(compressor)

    if (preset.wobbleHz > 0 && preset.wobbleDepth > 0 && typeof ctx.createOscillator === 'function') {
      try {
        const wobbleGain = ctx.createGain()
        wobbleGain.gain.value = 1.0 - preset.wobbleDepth * 0.5

        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = preset.wobbleHz

        const lfoDepth = ctx.createGain()
        lfoDepth.gain.value = preset.wobbleDepth * 0.5

        lfo.connect(lfoDepth)
        lfoDepth.connect(wobbleGain.gain)
        lfo.start()
        this.wobbleOsc = lfo

        compressor.connect(wobbleGain)
        wobbleGain.connect(masterGain)
      } catch {
        compressor.connect(masterGain)
      }
    } else {
      compressor.connect(masterGain)
    }

    return { inputNode: highpass, noiseTarget: highpass, preset }
  }

  private startPhoneLineStatic(
    ctx: AudioContext,
    target: AudioNode,
    noiseLevel = 0.014
  ): void {
    try {
      if (!this.lineNoiseBuffer) {
        this.lineNoiseBuffer = createLineNoiseBuffer(ctx, 2)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = this.lineNoiseBuffer
      noise.loop = true

      const noiseGain = ctx.createGain()
      noiseGain.gain.value = noiseLevel

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
    speakerIndex = 0,
    speed = 1.0
  ): Promise<AudioBuffer> {
    const cleanText = text.trim()
    const safeSpeed = Math.round(Math.min(2.0, Math.max(0.5, speed)) * 100) / 100
    const profile = getSpeakerVoiceProfile(speakerIndex)
    const baseCacheKey = `${accent}:::${cleanText}`
    const voiceCacheKey =
      profile.id === 'voice-a' ? baseCacheKey : `${accent}:::${profile.id}:::${cleanText}`
    const finalCacheKey =
      Math.abs(safeSpeed - 1.0) < 0.01 ? voiceCacheKey : `${voiceCacheKey}:::spd=${safeSpeed}`

    const cachedFinal = bufferCache.get(finalCacheKey)
    if (cachedFinal) return cachedFinal

    const ctx = this.getAudioContext()
    if (!ctx) {
      throw new Error('Web Audio API is unavailable in this environment')
    }

    let voiceBuffer = bufferCache.get(voiceCacheKey)
    if (!voiceBuffer) {
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

        if (typeof Blob !== 'undefined') {
          rawBlobCache.set(baseCacheKey, new Blob([arrayBuf], { type: contentType || 'audio/mpeg' }))
        }

        baseBuffer = await decodeAudioDataCompat(ctx, arrayBuf)
        bufferCache.set(baseCacheKey, baseBuffer)
      }

      if (Math.abs(profile.pitchRatio - 1.0) >= 0.01) {
        voiceBuffer = pitchShiftAudioBuffer(ctx, baseBuffer, profile.pitchRatio)
        bufferCache.set(voiceCacheKey, voiceBuffer)
      } else {
        voiceBuffer = baseBuffer
      }
    }

    // Apply pitch-preserving WSOLA time-stretch when playback speed != 1.0
    if (Math.abs(safeSpeed - 1.0) >= 0.01) {
      const stretched = timeStretchAudioBuffer(ctx, voiceBuffer, safeSpeed)
      bufferCache.set(finalCacheKey, stretched)
      return stretched
    }

    return voiceBuffer
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
    try {
      this.wobbleOsc?.stop()
    } catch {
      // ignore
    }
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause()
        this.activeHtmlAudio.src = ''
      } catch {
        // ignore
      }
      this.activeHtmlAudio = null
    }
    if (this.activeBlobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(this.activeBlobUrl)
      } catch {
        // ignore
      }
      this.activeBlobUrl = null
    }
    this.activeSource = null
    this.leadInSource = null
    this.noiseSource = null
    this.wobbleOsc = null
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

  private async playWithHtmlAudioFallback(
    cleanText: string,
    accent: VoiceAccent,
    speed: number,
    token: number,
    onStart?: () => void,
    onEnd?: () => void,
    onFallbackUsed?: (usedFallback: boolean, fallbackVoiceMatched?: boolean) => void
  ): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return false
    try {
      const baseCacheKey = `${accent}:::${cleanText}`
      let blob = rawBlobCache.get(baseCacheKey)
      if (!blob) {
        const url = apiClient.getTtsAudioUrl(cleanText, accent)
        const res = await fetch(url)
        if (!res.ok) return false
        const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
        if (contentType.includes('text/html') || contentType.includes('application/json')) {
          return false
        }
        blob = await res.blob()
        if (blob.size < 64) return false
        rawBlobCache.set(baseCacheKey, blob)
      }
      if (this.playbackToken !== token) return false

      const blobUrl = URL.createObjectURL(blob)
      this.activeBlobUrl = blobUrl
      const audioEl = new Audio(blobUrl)
      audioEl.playbackRate = Math.min(2.0, Math.max(0.5, speed))
      this.activeHtmlAudio = audioEl

      audioEl.onended = () => {
        if (this.playbackToken !== token) return
        this.activeHtmlAudio = null
        onEnd?.()
      }
      audioEl.onerror = () => {
        if (this.playbackToken !== token) return
        this.activeHtmlAudio = null
        onEnd?.()
      }

      await audioEl.play()
      if (this.playbackToken !== token) {
        audioEl.pause()
        return false
      }
      onFallbackUsed?.(false)
      onStart?.()
      return true
    } catch {
      return false
    }
  }

  async playSegment(options: PlayAudioSegmentOptions): Promise<void> {
    this.stop()
    const token = this.playbackToken

    // Unlock AudioContext synchronously inside tap/click gesture for iOS Safari & Android Chrome
    const unlockedCtx = this.unlockAudio()

    const {
      text,
      accent = 'en-GB',
      speed = 1.0,
      speakerIndex = 0,
      leadInSpeakerIndex,
      isPhoneCallMode = false,
      phoneCallLevel = 1,
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
      const ctx = unlockedCtx || this.getAudioContext()
      if (!ctx) throw new Error('AudioContext unavailable')

      const effectiveLeadInSpeaker = leadInSpeakerIndex ?? speakerIndex
      const mainBufferPromise = this.fetchSegmentBuffer(cleanText, accent, speakerIndex, speed)
      const leadInBufferPromise = leadInText?.trim()
        ? this.fetchSegmentBuffer(leadInText.trim(), accent, effectiveLeadInSpeaker, speed).catch(
            () => null
          )
        : Promise.resolve(null)

      const [mainBuffer, leadInBuffer] = await Promise.all([
        mainBufferPromise,
        leadInBufferPromise,
      ])

      if (this.playbackToken !== token) return

      if (ctx.state !== 'running') {
        try {
          await ctx.resume()
        } catch {
          // handled below
        }
      }

      if (this.playbackToken !== token) return

      if (ctx.state !== 'running') {
        const htmlPlayed = await this.playWithHtmlAudioFallback(
          cleanText,
          accent,
          speed,
          token,
          onStart,
          onEnd,
          onFallbackUsed
        )
        if (htmlPlayed) return
      }

      const { inputNode, noiseTarget, preset } = this.createDestinationChain(
        ctx,
        isPhoneCallMode,
        phoneCallLevel
      )
      if (isPhoneCallMode && noiseTarget) {
        this.startPhoneLineStatic(ctx, noiseTarget, preset.noiseGain)
      }

      onFallbackUsed?.(false)
      onStart?.()

      const now = ctx.currentTime
      let mainStartAt = now

      if (leadInBuffer && leadInBuffer.duration > 0.3) {
        const leadInSrc = ctx.createBufferSource()
        leadInSrc.buffer = leadInBuffer
        leadInSrc.playbackRate.value = 1.0
        this.connectWithSpeakerEq(ctx, leadInSrc, inputNode, effectiveLeadInSpeaker)

        const sliceDuration = Math.min(1.1, leadInBuffer.duration)
        const offset = Math.max(0, leadInBuffer.duration - sliceDuration)
        leadInSrc.start(now, offset, sliceDuration)
        this.leadInSource = leadInSrc

        mainStartAt = now + sliceDuration + 0.08
      }

      const mainSrc = ctx.createBufferSource()
      mainSrc.buffer = mainBuffer
      mainSrc.playbackRate.value = 1.0
      this.connectWithSpeakerEq(ctx, mainSrc, inputNode, speakerIndex)
      this.activeSource = mainSrc

      mainSrc.onended = () => {
        if (this.playbackToken !== token) return
        try {
          this.noiseSource?.stop()
        } catch {
          // ignore
        }
        try {
          this.wobbleOsc?.stop()
        } catch {
          // ignore
        }
        this.noiseSource = null
        this.wobbleOsc = null
        this.activeSource = null
        onEnd?.()
      }

      mainSrc.start(mainStartAt)
    } catch (err) {
      if (this.playbackToken !== token) return
      const htmlPlayed = await this.playWithHtmlAudioFallback(
        cleanText,
        accent,
        speed,
        token,
        onStart,
        onEnd,
        onFallbackUsed
      )
      if (htmlPlayed) return

      const fallbackStarted = await this.playWithSpeechSynthesisFallback(options, token)
      if (!fallbackStarted) {
        const message = err instanceof Error ? err.message : 'Unable to play synthesized audio'
        onError?.(message)
      }
    }
  }
}

export const sharedTtsAudioEngine = new TtsAudioEngine()
