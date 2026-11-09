-- ListenFlow Cloudflare D1 Migration
-- Version: 0003
-- Description: Track daily listening streak and streak freeze mechanism

CREATE TABLE IF NOT EXISTS user_streaks (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    freeze_used_dates TEXT NOT NULL DEFAULT '[]',
    last_freeze_week TEXT,
    freeze_available INTEGER NOT NULL DEFAULT 1,
    total_days_active INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_updated ON user_streaks(updated_at DESC);

