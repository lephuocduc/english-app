// Re-export FSRS engine (powered by ts-fsrs) for backwards-compatible imports across the codebase
export {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  FSRS_STATE_LABELS,
  createInitialFSRSFields,
  vocabularyItemToFSRSCard,
  formatFSRSInterval,
  getSchedulingPreviews,
  calculateNextReview,
  getIntervalPreviewText,
  getNextReviewBadgeText,
  isWordDue,
  getDueVocabulary,
  getSRSStats,
  toggleWordMastered,
  createClozeSentence,
  speakWord,
  speakSentence,
} from './fsrsEngine'

export type { SRSReviewResult, FSRSScheduleOption, SRSStats } from './fsrsEngine'
