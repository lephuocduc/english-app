import { describe, expect, it } from 'vitest'
import { normalizeWord, scoreDictation, tokenizeText } from '../lib/scoring/scorer'

describe('Scoring Engine (Word Normalization & Tokenization)', () => {
  it('normalizes capitalization to lowercase', () => {
    expect(normalizeWord('Apple')).toBe('apple')
    expect(normalizeWord('HELLO')).toBe('hello')
  })

  it('strips surrounding punctuation while keeping characters intact', () => {
    expect(normalizeWord('"Hello!"')).toBe('hello')
    expect(normalizeWord('world,')).toBe('world')
    expect(normalizeWord('(example)...')).toBe('example')
  })

  it('preserves contractions and meaningful apostrophes', () => {
    expect(normalizeWord("don't")).toBe("don't")
    expect(normalizeWord("it's")).toBe("it's")
    expect(normalizeWord("learner's")).toBe("learner's")
    expect(normalizeWord("they're")).toBe("they're")
    expect(normalizeWord("we'll")).toBe("we'll")
  })

  it('normalizes smart/curly quotes to ASCII apostrophe', () => {
    expect(normalizeWord('don’t')).toBe("don't")
    expect(normalizeWord('it‘s')).toBe("it's")
  })

  it('tokenizes multiple words properly', () => {
    const tokens = tokenizeText("  Hello,  world! It's great. ")
    expect(tokens.map((t) => t.normalized)).toEqual(['hello', 'world', "it's", 'great'])
  })
})

describe('Scoring Engine (Word Alignment and Similarity Calculation)', () => {
  it('scores 100 for exact match', () => {
    const expected = 'The quick brown fox jumps over the lazy dog.'
    const user = 'The quick brown fox jumps over the lazy dog.'
    const result = scoreDictation(expected, user)

    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(9)
    expect(result.missingCount).toBe(0)
    expect(result.incorrectCount).toBe(0)
    expect(result.extraCount).toBe(0)
    expect(result.alignments.every((a) => a.status === 'correct')).toBe(true)
  })

  it('ignores capitalization differences and gives 100 score', () => {
    const expected = 'Stay hungry, stay foolish.'
    const user = 'STAY HUNGRY, STAY FOOLISH.'
    const result = scoreDictation(expected, user)

    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(4)
    expect(result.missingCount).toBe(0)
  })

  it('ignores punctuation differences and gives 100 score', () => {
    const expected = 'Hello, world! How are you doing?'
    const user = 'Hello world How are you doing'
    const result = scoreDictation(expected, user)

    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(6)
    expect(result.missingCount).toBe(0)
  })

  it('identifies missing words accurately', () => {
    const expected = 'We have a meeting tomorrow morning'
    const user = 'We have meeting morning' // missing 'a' and 'tomorrow'
    const result = scoreDictation(expected, user)

    expect(result.score).toBeLessThan(100)
    expect(result.missingCount).toBe(2)
    expect(result.correctCount).toBe(4)
    expect(result.incorrectCount).toBe(0)
    expect(result.extraCount).toBe(0)
  })

  it('identifies extra words accurately', () => {
    const expected = 'I like learning English'
    const user = 'I really really like learning English' // 2 extra words: really, really
    const result = scoreDictation(expected, user)

    expect(result.score).toBeLessThan(100)
    expect(result.extraCount).toBe(2)
    expect(result.correctCount).toBe(4)
  })

  it('identifies incorrect words (substitutions) accurately', () => {
    const expected = 'She plays piano very well'
    const user = 'She plays guitar very well' // 'guitar' instead of 'piano'
    const result = scoreDictation(expected, user)

    expect(result.score).toBeLessThan(100)
    expect(result.incorrectCount).toBe(1)
    expect(result.correctCount).toBe(4)
    const sub = result.alignments.find((a) => a.status === 'incorrect')
    expect(sub?.expectedWord).toBe('piano')
    expect(sub?.userWord).toBe('guitar')
  })

  it('handles empty user input safely with 0 score and all missing words', () => {
    const expected = 'This is an important lesson.'
    const user = ''
    const result = scoreDictation(expected, user)

    expect(result.score).toBe(0)
    expect(result.missingCount).toBe(5)
    expect(result.correctCount).toBe(0)
    expect(result.alignments.every((a) => a.status === 'missing')).toBe(true)
  })

  it('handles empty expected text and empty user input safely', () => {
    const result = scoreDictation('', '')
    expect(result.score).toBe(100)
    expect(result.totalExpectedWords).toBe(0)
    expect(result.alignments).toHaveLength(0)
  })

  it('correctly handles contractions and apostrophes', () => {
    const expected = "Don't worry, it's going to be fine."
    const user = "Don't worry, it's going to be fine."
    const result = scoreDictation(expected, user)

    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(7)
  })

  it('matches contractions with curly quotes against ASCII apostrophe', () => {
    const expected = "They’re ready for the learner’s exam."
    const user = "They're ready for the learner's exam."
    const result = scoreDictation(expected, user)

    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(6)
  })
})
