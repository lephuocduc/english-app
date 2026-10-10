import type { AlignmentWord, ScoreResult } from '../../types'

/**
 * Normalizes a single word token for comparison:
 * - Converts to lowercase
 * - Normalizes smart/curly quotes and apostrophes to standard straight apostrophe '
 * - Strips leading and trailing punctuation (quotes, periods, commas, exclamation, brackets, etc.)
 * - Preserves meaningful internal apostrophes (e.g., don't, it's, learner's)
 */
export function normalizeWord(word: string): string {
  if (!word) return ''
  
  // Replace smart quotes with standard ASCII apostrophe
  let normalized = word
    .replace(/[\u2018\u2019\u201A\u201B\u02BC\u02B9`]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .toLowerCase()
    .trim()

  // Remove leading punctuation that is not part of the word
  normalized = normalized.replace(/^[^\w']+/gu, '')
  // Remove trailing punctuation that is not part of the word
  normalized = normalized.replace(/[^\w']+$/gu, '')
  
  // Clean single stray apostrophes at ends (e.g., 'word' -> word)
  normalized = normalized.replace(/^'+|'+$/g, '')

  return normalized
}

/**
 * Splits raw text into whitespace-delimited tokens while keeping original token representations.
 */
export function tokenizeText(text: string): { original: string; normalized: string }[] {
  if (!text || !text.trim()) {
    return []
  }

  // Split on whitespace
  const rawTokens = text.trim().split(/\s+/)
  const tokens: { original: string; normalized: string }[] = []

  for (const raw of rawTokens) {
    const norm = normalizeWord(raw)
    if (norm.length > 0) {
      tokens.push({
        original: raw,
        normalized: norm,
      })
    }
  }

  return tokens
}

/**
 * Computes word-level alignment and similarity score between expected transcript and user input.
 * Uses dynamic programming (Needleman-Wunsch / Levenshtein word distance).
 */
export function scoreDictation(expectedText: string, userInput: string): ScoreResult {
  const expectedTokens = tokenizeText(expectedText)
  const userTokens = tokenizeText(userInput)

  const n = expectedTokens.length
  const m = userTokens.length

  // Edge case 1: Both empty
  if (n === 0 && m === 0) {
    return {
      score: 100,
      accuracy: 1,
      totalExpectedWords: 0,
      totalUserWords: 0,
      correctCount: 0,
      missingCount: 0,
      incorrectCount: 0,
      extraCount: 0,
      alignments: [],
      feedbackText: 'Không có nội dung đối chiếu.',
    }
  }

  // Edge case 2: Expected empty, user non-empty
  if (n === 0 && m > 0) {
    const alignments: AlignmentWord[] = userTokens.map((t, idx) => ({
      id: `align-${idx}`,
      status: 'extra',
      userWord: t.original,
    }))
    return {
      score: 0,
      accuracy: 0,
      totalExpectedWords: 0,
      totalUserWords: m,
      correctCount: 0,
      missingCount: 0,
      incorrectCount: 0,
      extraCount: m,
      alignments,
      feedbackText: 'Đoạn này không có transcript mong đợi.',
    }
  }

  // Edge case 3: User input empty, expected non-empty
  if (n > 0 && m === 0) {
    const alignments: AlignmentWord[] = expectedTokens.map((t, idx) => ({
      id: `align-${idx}`,
      status: 'missing',
      expectedWord: t.original,
    }))
    return {
      score: 0,
      accuracy: 0,
      totalExpectedWords: n,
      totalUserWords: 0,
      correctCount: 0,
      missingCount: n,
      incorrectCount: 0,
      extraCount: 0,
      alignments,
      feedbackText: 'Bạn chưa nhập câu trả lời.',
    }
  }

  // DP table for Levenshtein Distance over word tokens
  // dp[i][j] = minimum edit distance to transform expectedTokens[0..i-1] into userTokens[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = 0; i <= n; i++) {
    dp[i][0] = i // deletions (missing)
  }
  for (let j = 0; j <= m; j++) {
    dp[0][j] = j // insertions (extra)
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const isMatch = expectedTokens[i - 1].normalized === userTokens[j - 1].normalized
      if (isMatch) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        const substitution = dp[i - 1][j - 1] + 1
        const deletion = dp[i - 1][j] + 1 // missing in user
        const insertion = dp[i][j - 1] + 1 // extra in user
        dp[i][j] = Math.min(substitution, deletion, insertion)
      }
    }
  }

  // Backtrack to build the alignment sequence
  let i = n
  let j = m
  const reversedAlignments: AlignmentWord[] = []
  let correctCount = 0
  let missingCount = 0
  let incorrectCount = 0
  let extraCount = 0
  let alignmentId = 0

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expectedTokens[i - 1].normalized === userTokens[j - 1].normalized) {
      reversedAlignments.push({
        id: `align-${alignmentId++}`,
        status: 'correct',
        expectedWord: expectedTokens[i - 1].original,
        userWord: userTokens[j - 1].original,
      })
      correctCount++
      i--
      j--
    } else if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      reversedAlignments.push({
        id: `align-${alignmentId++}`,
        status: 'incorrect',
        expectedWord: expectedTokens[i - 1].original,
        userWord: userTokens[j - 1].original,
      })
      incorrectCount++
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      reversedAlignments.push({
        id: `align-${alignmentId++}`,
        status: 'missing',
        expectedWord: expectedTokens[i - 1].original,
      })
      missingCount++
      i--
    } else {
      reversedAlignments.push({
        id: `align-${alignmentId++}`,
        status: 'extra',
        userWord: userTokens[j - 1].original,
      })
      extraCount++
      j--
    }
  }

  const alignments = reversedAlignments.reverse()
  const editDistance = dp[n][m]

  // Calculate similarity ratio:
  // Using normalized Levenshtein distance bounded by max(n, m)
  const maxLen = Math.max(n, m)
  const accuracy = Math.max(0, (maxLen - editDistance) / maxLen)
  const score = Math.max(0, Math.min(100, Math.round(accuracy * 100)))

  let feedbackText = ''
  if (score === 100) {
    feedbackText = 'Xuất sắc! Bạn đã nghe và gõ chính xác 100%!'
  } else if (score >= 80) {
    feedbackText = 'Rất tốt! Chỉ một vài lỗi nhỏ, hãy đối chiếu các từ chưa chính xác.'
  } else if (score >= 50) {
    feedbackText = 'Khá ổn! Hãy nghe lại phân đoạn này để nhận diện rõ các từ bị sót hoặc gõ nhầm.'
  } else {
    feedbackText = 'Cần cố gắng thêm. Hãy giảm tốc độ và nghe lại từng cụm từ nhỏ.'
  }

  return {
    score,
    accuracy,
    totalExpectedWords: n,
    totalUserWords: m,
    correctCount,
    missingCount,
    incorrectCount,
    extraCount,
    alignments,
    feedbackText,
  }
}
