export interface SentenceSegment {
  id: string
  startTime: number // in seconds
  endTime: number // in seconds
  text: string
  translation?: string
  hint?: string
  speaker?: string
}

export type LessonSourceType = 'youtube' | 'audio'

export type VoiceAccent = 'en-US' | 'en-GB' | 'en-AU'

export interface Lesson {
  id: string
  title: string
  videoId: string
  sourceType?: LessonSourceType
  voiceAccent?: VoiceAccent
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
  firstAttemptScore?: number
  firstAttemptAt?: string
  isRevealed: boolean
  attempts: number
  completed: boolean
  lastAttemptAt: string
}

export interface FirstAttemptRecord {
  lessonId: string
  segmentId: string
  score: number
  createdAt: string
}

export interface UserLessonProgress {
  lessonId: string
  sentenceProgress: Record<string, UserSentenceProgress>
  lastSentenceId: string
  updatedAt: string
}

export type PhoneCallLevel = 1 | 2 | 3

export interface StudyPreferences {
  playbackSpeed: number
  autoReplayCount: number
  volume: number
  showInstantHint: boolean
  isDarkMode?: boolean
  isBlindListening?: boolean
  isFocusMode?: boolean
  showSubtitles?: boolean
  hasAudioLeadIn?: boolean
  isPhoneCallMode?: boolean
  phoneCallLevel?: PhoneCallLevel
  isLooping?: boolean
  ttsAccent?: VoiceAccent
}

export type SRSRating = 1 | 2 | 3 | 4 // 1: Again, 2: Hard, 3: Good, 4: Easy

export type FSRSStateValue = 0 | 1 | 2 | 3 // 0: New, 1: Learning, 2: Review, 3: Relearning

export interface VocabularyReviewLog {
  id?: string
  card_id: string
  rating: SRSRating
  state: FSRSStateValue
  due: string | null
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  review_time: string
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

  // FSRS (ts-fsrs) spaced repetition fields:
  due?: string // UTC ISO timestamp when next review is due
  stability?: number // Memory stability in days
  difficulty?: number // Card difficulty (1 to 10; 0 for brand-new card)
  elapsed_days?: number // Days elapsed since previous review
  scheduled_days?: number // Days scheduled until next review
  reps?: number // Total number of reviews
  lapses?: number // Number of times card was forgotten (Again)
  learning_steps?: number // Current FSRS short-term learning step index
  state?: FSRSStateValue // 0: New, 1: Learning, 2: Review, 3: Relearning
  last_review?: string | null // UTC ISO timestamp of most recent review

  // Legacy / compatibility SRS fields (kept in sync with FSRS):
  mastered?: boolean
  interval?: number // Mirrors scheduled_days
  easeFactor?: number // Legacy SM-2 field
  repetitions?: number // Mirrors reps
  dueDate?: string // Mirrors due.slice(0, 10)
  lastReviewedAt?: string // Mirrors last_review
}

export type NavTab = 'practice' | 'lessons' | 'vocabulary' | 'progress'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null // 'YYYY-MM-DD'
  freezeUsedDates: string[] // List of dates 'YYYY-MM-DD' where streak freeze was used
  lastFreezeWeek: string | null // e.g. '2026-W46'
  freezeAvailable: boolean // 1 freeze allowed per calendar week
  todayCompleted: boolean // whether completed at least 1 segment today
  totalDaysActive: number
}

export interface YouTubeUrlParseResult {
  isValid: boolean
  videoId?: string
  normalizedUrl?: string
  error?: string
}
