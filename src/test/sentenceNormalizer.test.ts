import { describe, it, expect } from 'vitest'
import {
  normalizeSentenceBoundaries,
  getBrokenSentencePrefix,
} from '../lib/transcript/sentenceNormalizer'
import type { SentenceSegment } from '../types'

describe('normalizeSentenceBoundaries', () => {
  it('preserves raw transcript segments faithfully without artificial word shifting', () => {
    const raw: SentenceSegment[] = [
      {
        id: 'seg-13',
        startTime: 59.2,
        endTime: 68.3,
        text: 'Catherine Brush, who was an American newspaper columnist, a short story writer, a novelist. This',
      },
      {
        id: 'seg-14',
        startTime: 68.3,
        endTime: 77.6,
        text: 'particular story was published in 1946. But like all good writing, it still remains fresh today.',
      },
    ]

    const result = normalizeSentenceBoundaries(raw)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe(raw[0].text)
    expect(result[1].text).toBe(raw[1].text)
    expect(result[0].startTime).toBe(raw[0].startTime)
    expect(result[0].endTime).toBe(raw[0].endTime)
    expect(result[1].startTime).toBe(raw[1].startTime)
    expect(result[1].endTime).toBe(raw[1].endTime)
  })

  it('handles empty and single segment arrays gracefully', () => {
    expect(normalizeSentenceBoundaries([])).toEqual([])
    const single: SentenceSegment[] = [
      { id: '1', startTime: 0, endTime: 5, text: 'Single sentence.' },
    ]
    expect(normalizeSentenceBoundaries(single)).toEqual(single)
  })
})

describe('getBrokenSentencePrefix', () => {
  it('returns empty string for first segment or when previous segment ends cleanly with sentence punctuation', () => {
    const segs: SentenceSegment[] = [
      { id: '1', startTime: 0, endTime: 4, text: 'First complete sentence.' },
      { id: '2', startTime: 4, endTime: 8, text: 'Second complete sentence?' },
      { id: '3', startTime: 8, endTime: 12, text: 'Third sentence here.' },
    ]
    expect(getBrokenSentencePrefix(segs, 0)).toBe('')
    expect(getBrokenSentencePrefix(segs, 1)).toBe('')
    expect(getBrokenSentencePrefix(segs, 2)).toBe('')
  })

  it('extracts only the trailing incomplete clause after the last sentence boundary in the previous segment', () => {
    const segs: SentenceSegment[] = [
      {
        id: 'seg-13',
        startTime: 59.2,
        endTime: 68.3,
        text: 'of fresh and new. So I am gonna start in just a second, but first of all, just one question for',
      },
      {
        id: 'seg-14',
        startTime: 68.3,
        endTime: 77.6,
        text: 'you before we begin the story.',
      },
    ]

    expect(getBrokenSentencePrefix(segs, 1)).toBe(
      'So I am gonna start in just a second, but first of all, just one question for'
    )
  })

  it('walks back across multiple mid-sentence segments up to the start of the split sentence', () => {
    const segs: SentenceSegment[] = [
      { id: '1', startTime: 0, endTime: 3, text: 'He smiled warmly.' },
      { id: '2', startTime: 3, endTime: 6, text: 'After that we went' },
      { id: '3', startTime: 6, endTime: 9, text: 'to the store to' },
      { id: '4', startTime: 9, endTime: 12, text: 'buy some milk.' },
    ]

    expect(getBrokenSentencePrefix(segs, 3)).toBe('After that we went to the store to')
  })

  it('does not split at abbreviations like Mr.', () => {
    const segs: SentenceSegment[] = [
      { id: '1', startTime: 0, endTime: 3, text: 'Yesterday I met Mr.' },
      { id: '2', startTime: 3, endTime: 6, text: 'Smith at the station.' },
    ]

    expect(getBrokenSentencePrefix(segs, 1)).toBe('Yesterday I met Mr.')
  })
})
