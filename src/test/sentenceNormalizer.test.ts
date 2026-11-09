import { describe, it, expect } from 'vitest'
import { normalizeSentenceBoundaries } from '../lib/transcript/sentenceNormalizer'
import type { SentenceSegment } from '../types'

describe('normalizeSentenceBoundaries', () => {
  it('shifts dangling word after terminal punctuation to next segment', () => {
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

    const normalized = normalizeSentenceBoundaries(raw)

    expect(normalized[0].text).toBe(
      'Catherine Brush, who was an American newspaper columnist, a short story writer, a novelist.'
    )
    expect(normalized[1].text).toBe(
      'This particular story was published in 1946. But like all good writing, it still remains fresh today.'
    )
    expect(normalized[0].endTime).toBeLessThan(68.3)
    expect(normalized[1].startTime).toBe(normalized[0].endTime)
  })

  it('handles question marks with trailing words correctly', () => {
    const raw: SentenceSegment[] = [
      {
        id: 'seg-34',
        startTime: 100.0,
        endTime: 105.0,
        text: 'feel a little uncomfortable or embarrassed? Like',
      },
      {
        id: 'seg-35',
        startTime: 105.0,
        endTime: 110.0,
        text: "maybe you got an insight into someone's personal relationship",
      },
    ]

    const normalized = normalizeSentenceBoundaries(raw)

    expect(normalized[0].text).toBe('feel a little uncomfortable or embarrassed?')
    expect(normalized[1].text).toBe(
      "Like maybe you got an insight into someone's personal relationship"
    )
  })

  it('preserves valid sentences ending naturally with terminal punctuation', () => {
    const raw: SentenceSegment[] = [
      {
        id: 'seg-1',
        startTime: 0.0,
        endTime: 5.0,
        text: 'Hello, welcome to this English podcast.',
      },
      {
        id: 'seg-2',
        startTime: 5.0,
        endTime: 10.0,
        text: 'Today we will discuss an interesting story.',
      },
    ]

    const normalized = normalizeSentenceBoundaries(raw)

    expect(normalized[0].text).toBe('Hello, welcome to this English podcast.')
    expect(normalized[1].text).toBe('Today we will discuss an interesting story.')
    expect(normalized[0].endTime).toBe(5.0)
    expect(normalized[1].startTime).toBe(5.0)
  })

  it('does not falsely split abbreviations like Dr. or U.S.', () => {
    const raw: SentenceSegment[] = [
      {
        id: 'seg-1',
        startTime: 0.0,
        endTime: 5.0,
        text: 'He visited Dr. Smith yesterday',
      },
      {
        id: 'seg-2',
        startTime: 5.0,
        endTime: 10.0,
        text: 'and received a prescription.',
      },
    ]

    const normalized = normalizeSentenceBoundaries(raw)

    expect(normalized[0].text).toBe('He visited Dr. Smith yesterday')
    expect(normalized[1].text).toBe('and received a prescription.')
  })
})
