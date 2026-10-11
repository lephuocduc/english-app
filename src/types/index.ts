export interface SentenceSegment {
  id: string
  startTime: number // in seconds
  endTime: number // in seconds
  text: string
  translation?: string
  hint?: string
}

export interface Lesson {
  id: string
  title: string
  videoId: string
  language?: string
  transcriptSource?: string
  isVerified?: boolean
  level?: 'Beginner' | 'Intermediate' | 'Advanced'
  description?: string
  sentences: SentenceSegment[]
}

export type YouTubeVideo = Lesson


export type TranscriptStatus = 'loading' | 'available' | 'unavailable' | 'error'

export interface TranscriptResult {
  status: TranscriptStatus
  data?: SentenceSegment[]
  error?: string
  sourceName?: string
}

export interface TranscriptProvider {
  name: string
  canProvide(videoId: string): boolean
  getTranscript(videoId: string): Promise<TranscriptResult>
}

export type WordMatchStatus = 'correct' | 'missing' | 'incorrect' | 'extra'

export interface AlignmentWord {
  id: string
  status: WordMatchStatus
  userWord?: string
  expectedWord?: string
}

export interface ScoreResult {
  score: number // 0 to 100
  accuracy: number // 0 to 1
  totalExpectedWords: number
  totalUserWords: number
  correctCount: number
  missingCount: number
  incorrectCount: number
  extraCount: number
  alignments: AlignmentWord[]
  feedbackText: string
}

export interface UserSentenceProgress {
  sentenceId: string
  userInput: string
  score: number
  isRevealed: boolean
  attempts: number
  completed: boolean
  lastAttemptAt: string
}

export interface UserLessonProgress {
  lessonId: string
  sentenceProgress: Record<string, UserSentenceProgress>
  lastSentenceId: string
  updatedAt: string
}

export interface StudyPreferences {
  playbackSpeed: number
  autoReplayCount: number
  volume: number
  showInstantHint: boolean
  isDarkMode?: boolean
  isBlindListening?: boolean
  isFocusMode?: boolean
}

export interface VocabularyItem {
  id: string
  word: string
  meaning?: string
  contextSentence: string
  contextSentenceTranslation?: string
  timestamp: number
  videoId: string
  lessonTitle: string
  savedAt: string
}

export type NavTab = 'practice' | 'lessons' | 'vocabulary' | 'progress'

export interface YouTubeUrlParseResult {
  isValid: boolean
  videoId?: string
  normalizedUrl?: string
  error?: string
}
