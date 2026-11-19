import type { SentenceSegment } from '../../types'

export interface SpeakerVoiceProfile {
  id: string
  label: string
  pitchRatio: number
  preferredGender: 'female' | 'male'
  lowShelfGainDb: number
  highShelfGainDb: number
}

export const SPEAKER_VOICE_PROFILES: readonly SpeakerVoiceProfile[] = [
  {
    id: 'voice-a',
    label: 'Giọng A',
    pitchRatio: 1.0,
    preferredGender: 'female',
    lowShelfGainDb: 0,
    highShelfGainDb: 0,
  },
  {
    id: 'voice-b',
    label: 'Giọng B',
    pitchRatio: 0.8,
    preferredGender: 'male',
    lowShelfGainDb: 3.5,
    highShelfGainDb: -2.5,
  },
  {
    id: 'voice-c',
    label: 'Giọng C',
    pitchRatio: 1.11,
    preferredGender: 'female',
    lowShelfGainDb: -1.0,
    highShelfGainDb: 2.0,
  },
  {
    id: 'voice-d',
    label: 'Giọng D',
    pitchRatio: 0.88,
    preferredGender: 'male',
    lowShelfGainDb: 2.0,
    highShelfGainDb: -1.5,
  },
]

export function getSpeakerVoiceProfile(speakerIndex = 0): SpeakerVoiceProfile {
  const normalized = Math.abs(Math.floor(Number.isFinite(speakerIndex) ? speakerIndex : 0))
  return SPEAKER_VOICE_PROFILES[normalized % SPEAKER_VOICE_PROFILES.length]
}

/**
 * Extracts speaker / role name from a SentenceSegment:
 * 1) explicit `seg.speaker`
 * 2) leading `[Role]` prefix in `seg.translation` (used by preset IT Ops lessons)
 * 3) `[Speaker: Name]` prefix in `seg.hint` (persisted via D1 without schema changes)
 */
export function extractSpeakerFromSegment(
  seg?: Pick<SentenceSegment, 'speaker' | 'translation' | 'hint'> | null
): string | null {
  if (!seg) return null

  const explicit = seg.speaker?.trim()
  if (explicit) return explicit

  const translation = seg.translation?.trim() || ''
  const transMatch = translation.match(/^\[([^\]]{1,40})\]\s*/)
  if (transMatch && transMatch[1].trim()) {
    return transMatch[1].trim()
  }

  const hint = seg.hint?.trim() || ''
  const hintMatch = hint.match(/^\[Speaker:\s*([^\]]{1,40})\]/i)
  if (hintMatch && hintMatch[1].trim()) {
    return hintMatch[1].trim()
  }

  return null
}

export interface SegmentSpeakerAssignment {
  speaker: string
  speakerIndex: number
  profile: SpeakerVoiceProfile
}

export interface LessonSpeakerInfo {
  isDialogue: boolean
  speakers: string[]
  bySegmentId: Record<string, SegmentSpeakerAssignment>
}

/**
 * Maps segments in a lesson to distinct speaker indices in order of first appearance.
 * Single-speaker or unlabelled passages are treated as monologues (`isDialogue: false`).
 */
export function buildLessonSpeakerMap(
  sentences?: SentenceSegment[] | null
): LessonSpeakerInfo {
  if (!sentences || sentences.length === 0) {
    return { isDialogue: false, speakers: [], bySegmentId: {} }
  }

  const keyToIndex = new Map<string, number>()
  const speakers: string[] = []
  const tempAssignments: Record<string, SegmentSpeakerAssignment> = {}

  for (const seg of sentences) {
    const rawSpeaker = extractSpeakerFromSegment(seg)
    if (!rawSpeaker) continue

    const key = rawSpeaker.toLowerCase()
    let speakerIndex = keyToIndex.get(key)
    if (speakerIndex === undefined) {
      speakerIndex = speakers.length
      keyToIndex.set(key, speakerIndex)
      speakers.push(rawSpeaker)
    }

    tempAssignments[seg.id] = {
      speaker: rawSpeaker,
      speakerIndex,
      profile: getSpeakerVoiceProfile(speakerIndex),
    }
  }

  if (speakers.length < 2) {
    return { isDialogue: false, speakers: [], bySegmentId: {} }
  }

  return {
    isDialogue: true,
    speakers,
    bySegmentId: tempAssignments,
  }
}
