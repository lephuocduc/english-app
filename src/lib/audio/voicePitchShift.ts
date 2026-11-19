/**
 * Pure-TypeScript time-preserving pitch shifter using WSOLA
 * (Waveform Similarity Overlap-Add) + linear resampling.
 * Shifts fundamental vocal pitch without changing speaking duration.
 */

export function pitchShiftChannel(
  input: Float32Array,
  sampleRate: number,
  pitchRatio: number
): Float32Array {
  if (input.length < 64 || Math.abs(pitchRatio - 1.0) < 0.01) {
    return input.slice()
  }

  const ratio = Math.min(1.5, Math.max(0.6, pitchRatio))

  // Stage 1: WSOLA time-scale input by `ratio` (so Stage 2 resample restores original duration)
  const winSize = Math.max(128, Math.round(sampleRate * 0.03) & ~1)
  const halfWin = winSize >> 1
  const analysisHop = halfWin / ratio
  const maxDelta = Math.max(32, Math.round(sampleRate * 0.012))
  const stretchedLen = Math.max(winSize, Math.round(input.length * ratio))

  const hann = new Float32Array(winSize)
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / winSize))
  }

  const stretched = new Float32Array(stretchedLen)
  const norm = new Float32Array(stretchedLen)
  const maxStart = Math.max(0, input.length - winSize)

  // Initial frame
  const firstCopyLen = Math.min(winSize, input.length, stretchedLen)
  for (let i = 0; i < firstCopyLen; i++) {
    const w = hann[i]
    stretched[i] += input[i] * w
    norm[i] += w
  }

  let prevBestPos = 0

  for (let outPos = halfWin; outPos < stretchedLen; outPos += halfWin) {
    const idealPos = Math.round((outPos / halfWin) * analysisHop)
    const refPos = prevBestPos + halfWin
    const cmpLen = Math.min(halfWin, Math.max(0, input.length - refPos))

    let bestPos = Math.min(maxStart, Math.max(0, idealPos))

    if (cmpLen >= 16) {
      const scoreCandidate = (candPos: number, step: number): number => {
        let dot = 0
        let eA = 0
        let eB = 0
        for (let j = 0; j < cmpLen; j += step) {
          const a = input[candPos + j]
          const b = input[refPos + j]
          dot += a * b
          eA += a * a
          eB += b * b
        }
        return dot / (Math.sqrt(eA * eB) + 1e-12)
      }

      // Coarse search (step 4 in offset, step 2 in correlation)
      let bestCoarseDelta = 0
      let bestScore = -Infinity
      for (let d = -maxDelta; d <= maxDelta; d += 4) {
        const cand = idealPos + d
        if (cand < 0 || cand > maxStart) continue
        const s = scoreCandidate(cand, 2)
        if (s > bestScore) {
          bestScore = s
          bestCoarseDelta = d
        }
      }

      // Fine search around best coarse offset
      bestScore = -Infinity
      const fineStart = bestCoarseDelta - 4
      const fineEnd = bestCoarseDelta + 4
      for (let d = fineStart; d <= fineEnd; d++) {
        const cand = idealPos + d
        if (cand < 0 || cand > maxStart) continue
        const s = scoreCandidate(cand, 1)
        if (s > bestScore) {
          bestScore = s
          bestPos = cand
        }
      }
    }

    const frameCopy = Math.min(winSize, input.length - bestPos, stretchedLen - outPos)
    for (let i = 0; i < frameCopy; i++) {
      const w = hann[i]
      stretched[outPos + i] += input[bestPos + i] * w
      norm[outPos + i] += w
    }
    prevBestPos = bestPos
  }

  for (let i = 0; i < stretchedLen; i++) {
    if (norm[i] > 1e-4) {
      stretched[i] /= norm[i]
    }
  }

  // Stage 2: Resample `stretchedLen` back to exact `input.length` to shift pitch by `ratio`
  const output = new Float32Array(input.length)
  const scale = (stretchedLen - 1) / Math.max(1, input.length - 1)
  for (let i = 0; i < input.length; i++) {
    const pos = i * scale
    const idx = Math.floor(pos)
    const frac = pos - idx
    const s0 = stretched[idx] ?? 0
    const s1 = stretched[Math.min(stretchedLen - 1, idx + 1)] ?? s0
    const sample = s0 + (s1 - s0) * frac
    output[i] = Math.max(-1, Math.min(1, sample))
  }

  return output
}

export function pitchShiftAudioBuffer(
  ctx: AudioContext,
  source: AudioBuffer,
  pitchRatio: number
): AudioBuffer {
  if (Math.abs(pitchRatio - 1.0) < 0.01) {
    return source
  }

  const shifted = ctx.createBuffer(source.numberOfChannels, source.length, source.sampleRate)
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const inputData = source.getChannelData(ch)
    const shiftedData = pitchShiftChannel(inputData, source.sampleRate, pitchRatio)
    shifted.getChannelData(ch).set(shiftedData)
  }
  return shifted
}
