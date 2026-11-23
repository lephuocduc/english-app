-- Migration: 0007_add_hidden_adaptive_memory.sql
-- Hidden adaptive learning database (stored silently in D1, never shown on UI)
-- Tracks: (1) Weak Words, (2) Mastered Words (>= 3 consecutive correct), (3) Recent Lesson First-Attempt Scores

CREATE TABLE IF NOT EXISTS adaptive_word_memory (
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  miss_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  last_error_type TEXT, -- 'missing' | 'incorrect' | NULL
  last_wrong_input TEXT,
  status TEXT NOT NULL DEFAULT 'learning', -- 'weak' | 'learning' | 'mastered'
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, word)
);

CREATE TABLE IF NOT EXISTS adaptive_lesson_history (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT,
  first_attempt_avg REAL NOT NULL DEFAULT 0,
  graded_segments INTEGER NOT NULL DEFAULT 0,
  last_graded_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_word_status
  ON adaptive_word_memory(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_adaptive_lesson_recent
  ON adaptive_lesson_history(user_id, last_graded_at DESC);
