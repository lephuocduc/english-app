import { describe, it, expect } from 'vitest'
import { normalizeSentenceBoundaries } from '../lib/transcript/sentenceNormalizer'
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
