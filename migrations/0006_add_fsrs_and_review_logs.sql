-- Migration: 0006_add_fsrs_and_review_logs.sql
-- Upgrade Spaced Repetition to FSRS (ts-fsrs) and add review_logs table

ALTER TABLE saved_vocabulary ADD COLUMN due TEXT;
ALTER TABLE saved_vocabulary ADD COLUMN stability REAL DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN difficulty REAL DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN elapsed_days INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN scheduled_days INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN reps INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN lapses INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN learning_steps INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN state INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN last_review TEXT;

-- Backfill existing vocabulary records into FSRS columns cleanly
UPDATE saved_vocabulary
SET
  due = COALESCE(
    due,
    CASE
      WHEN due_date IS NOT NULL AND length(due_date) = 10 THEN due_date || 'T00:00:00.000Z'
      ELSE COALESCE(due_date, saved_at, datetime('now'))
    END
  ),
  scheduled_days = COALESCE(interval, 0),
  reps = COALESCE(repetitions, 0),
  stability = CASE WHEN COALESCE(interval, 0) > 0 THEN CAST(interval AS REAL) ELSE 0 END,
  difficulty = CASE WHEN COALESCE(repetitions, 0) > 0 THEN 5.0 ELSE 0 END,
  state = CASE WHEN COALESCE(repetitions, 0) > 0 THEN 2 ELSE 0 END,
  last_review = COALESCE(last_review, last_reviewed_at);

-- Review logs table for study statistics and future FSRS parameter optimization
CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  state INTEGER NOT NULL DEFAULT 0,
  due TEXT,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  review_time TEXT NOT NULL,
  FOREIGN KEY (card_id) REFERENCES saved_vocabulary(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_vocab_due ON saved_vocabulary(user_id, due);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_time ON review_logs(user_id, review_time DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_card ON review_logs(card_id, review_time DESC);
