-- ListenFlow Cloudflare D1 Initial Migration
-- Version: 0001
-- Description: Core tables for multi-user persistent storage with ownership and privacy safeguards

PRAGMA foreign_keys = ON;

-- 1. Users table (Zero unnecessary personal data: no passwords in plain text, no telemetry)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Lessons table (Stores metadata and YouTube video IDs only; NO video/audio files stored)
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    level TEXT DEFAULT 'Intermediate',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_user ON lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_video ON lessons(video_id);
CREATE INDEX IF NOT EXISTS idx_lessons_updated ON lessons(updated_at DESC);

-- 3. Transcript Segments (User-provided timestamped sentence markers)
CREATE TABLE IF NOT EXISTS transcript_segments (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    text TEXT NOT NULL,
    translation TEXT,
    hint TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_segments_lesson ON transcript_segments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_segments_user ON transcript_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_segments_order ON transcript_segments(lesson_id, sequence_order ASC);

-- 4. Dictation Attempts (Logs every attempt, score, accuracy, and word-level metrics)
CREATE TABLE IF NOT EXISTS dictation_attempts (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    segment_id TEXT NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_input TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    accuracy REAL NOT NULL CHECK (accuracy >= 0.0 AND accuracy <= 1.0),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
    missing_count INTEGER NOT NULL DEFAULT 0 CHECK (missing_count >= 0),
    incorrect_count INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
    extra_count INTEGER NOT NULL DEFAULT 0 CHECK (extra_count >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON dictation_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_segment ON dictation_attempts(segment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_lesson ON dictation_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON dictation_attempts(created_at DESC);

-- 5. Sentence Learning Progress (Tracks current learning state per sentence for spaced learning)
CREATE TABLE IF NOT EXISTS sentence_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    segment_id TEXT NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
    user_input TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    is_revealed INTEGER NOT NULL DEFAULT 0 CHECK (is_revealed IN (0, 1)),
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    last_attempt_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, lesson_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON sentence_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_segment ON sentence_progress(segment_id);

-- 6. Saved Vocabulary (Personal vocabulary notebook saved during listening sessions)
CREATE TABLE IF NOT EXISTS saved_vocabulary (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    meaning TEXT,
    context_sentence TEXT,
    timestamp REAL,
    video_id TEXT,
    lesson_title TEXT,
    saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vocab_user ON saved_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_user_word ON saved_vocabulary(user_id, word);
CREATE INDEX IF NOT EXISTS idx_vocab_saved ON saved_vocabulary(saved_at DESC);
