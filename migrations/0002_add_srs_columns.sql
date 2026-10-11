-- Migration: 0002_add_srs_columns.sql
-- Add Spaced Repetition (SRS) columns and context translation to saved_vocabulary

ALTER TABLE saved_vocabulary ADD COLUMN mastered INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN interval INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN ease_factor REAL DEFAULT 2.5;
ALTER TABLE saved_vocabulary ADD COLUMN repetitions INTEGER DEFAULT 0;
ALTER TABLE saved_vocabulary ADD COLUMN due_date TEXT;
ALTER TABLE saved_vocabulary ADD COLUMN last_reviewed_at TEXT;
ALTER TABLE saved_vocabulary ADD COLUMN context_sentence_translation TEXT;

UPDATE saved_vocabulary SET user_id = 'owner' WHERE user_id != 'owner';
