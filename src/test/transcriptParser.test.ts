import { describe, it, expect } from 'vitest'
import {
  cleanTranscriptText,
  parseTimestampToSeconds,
  parseSrtOrVtt,
  parseYouTubeTranscriptPanel,
  parseUniversalTranscript,
} from '../lib/transcript/transcriptParser'

describe('transcriptParser', () => {
  describe('cleanTranscriptText', () => {
    it('strips XML tags and decodes HTML entities', () => {
      const raw = '<c>Hello</c> &amp; welcome to &#39;ListenFlow&#39; &quot;App&quot;!'
      expect(cleanTranscriptText(raw)).toBe("Hello & welcome to 'ListenFlow' \"App\"!")
    })

    it('collapses excessive whitespaces', () => {
      expect(cleanTranscriptText('   Hello     world   \n  test   ')).toBe('Hello world test')
    })
  })

  describe('parseTimestampToSeconds', () => {
    it('parses MM:SS format', () => {
      expect(parseTimestampToSeconds('01:30')).toBe(90)
      expect(parseTimestampToSeconds('0:05')).toBe(5)
    })

    it('parses HH:MM:SS format', () => {
      expect(parseTimestampToSeconds('01:02:03')).toBe(3723)
    })

    it('parses fractional seconds with comma or period', () => {
      expect(parseTimestampToSeconds('00:01:23.456')).toBe(83.5)
      expect(parseTimestampToSeconds('00:01:23,456')).toBe(83.5)
    })
  })

  describe('parseSrtOrVtt', () => {
    it('parses standard WebVTT cues', () => {
      const vtt = `WEBVTT

00:00:07.470 --> 00:00:10.369
This program is brought to you by Stanford University.

00:00:10.470 --> 00:00:14.443
Please visit us at stanford.edu`

      const segments = parseSrtOrVtt(vtt)
      expect(segments).toHaveLength(2)
      expect(segments[0].startTime).toBe(7.5)
      expect(segments[0].endTime).toBe(10.4)
      expect(segments[0].text).toBe('This program is brought to you by Stanford University.')
      expect(segments[1].startTime).toBe(10.5)
      expect(segments[1].endTime).toBe(14.4)
      expect(segments[1].text).toBe('Please visit us at stanford.edu')
    })

    it('parses standard SubRip (.srt) subtitles', () => {
      const srt = `1
00:00:01,500 --> 00:00:04,200
Hello everyone and welcome back.

2
00:00:04,500 --> 00:00:08,100
Today we are learning English.`

      const segments = parseSrtOrVtt(srt)
      expect(segments).toHaveLength(2)
      expect(segments[0].startTime).toBe(1.5)
      expect(segments[0].endTime).toBe(4.2)
      expect(segments[0].text).toBe('Hello everyone and welcome back.')
      expect(segments[1].startTime).toBe(4.5)
      expect(segments[1].endTime).toBe(8.1)
    })

    it('ignores sound effect markers like [Music]', () => {
      const srt = `1
00:00:00,000 --> 00:00:02,000
[Music]

2
00:00:02,500 --> 00:00:05,000
Real spoken sentence here.`

      const segments = parseSrtOrVtt(srt)
      expect(segments).toHaveLength(1)
      expect(segments[0].text).toBe('Real spoken sentence here.')
    })
  })

  describe('parseYouTubeTranscriptPanel', () => {
    it('parses YouTube transcript panel Format A (timestamp above text)', () => {
      const raw = `0:05
Hello everyone
0:09
Welcome back to our channel`

      const segments = parseYouTubeTranscriptPanel(raw)
      expect(segments).toHaveLength(2)
      expect(segments[0].startTime).toBe(5)
      expect(segments[0].endTime).toBe(9)
      expect(segments[0].text).toBe('Hello everyone')
      expect(segments[1].startTime).toBe(9)
      expect(segments[1].text).toBe('Welcome back to our channel')
    })

    it('parses YouTube transcript panel Format B (timestamp and text on same line)', () => {
      const raw = `0:05 Hello everyone
0:09 Welcome back to our channel`

      const segments = parseYouTubeTranscriptPanel(raw)
      expect(segments).toHaveLength(2)
      expect(segments[0].startTime).toBe(5)
      expect(segments[0].endTime).toBe(9)
      expect(segments[0].text).toBe('Hello everyone')
      expect(segments[1].startTime).toBe(9)
      expect(segments[1].text).toBe('Welcome back to our channel')
    })
  })

  describe('parseUniversalTranscript', () => {
    it('auto-detects SRT/VTT format', () => {
      const result = parseUniversalTranscript(`WEBVTT\n00:00:01.000 --> 00:00:03.000\nHello`)
      expect(result.success).toBe(true)
      expect(result.format).toBe('vtt')
      expect(result.segments).toHaveLength(1)
    })

    it('auto-detects YouTube panel format', () => {
      const result = parseUniversalTranscript(`0:00 Test sentence 1\n0:05 Test sentence 2`)
      expect(result.success).toBe(true)
      expect(result.format).toBe('youtube_panel')
      expect(result.segments).toHaveLength(2)
    })

    it('falls back to raw text split by punctuation', () => {
      const result = parseUniversalTranscript('First sentence. Second sentence! Third sentence?')
      expect(result.success).toBe(true)
      expect(result.format).toBe('raw_text')
      expect(result.segments).toHaveLength(3)
      expect(result.segments[0].text).toBe('First sentence.')
      expect(result.segments[1].text).toBe('Second sentence!')
    })

    it('returns error on empty string', () => {
      const result = parseUniversalTranscript('   ')
      expect(result.success).toBe(false)
      expect(result.format).toBe('empty')
    })
  })
})
