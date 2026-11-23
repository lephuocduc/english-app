-- Migration: 0008_add_ending_s_tracking.sql
-- Track trailing -s/-es/'s ending sound errors separately from weak vocabulary words

ALTER TABLE adaptive_word_memory ADD COLUMN ending_s_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE adaptive_word_memory ADD COLUMN last_ending_s_input TEXT;
