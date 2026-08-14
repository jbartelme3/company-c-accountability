-- Migration 0002: rank_history table.
--
-- Checked remote's actual schema first (wrangler d1 execute --remote) rather
-- than assuming — cadets already had class_year/secondary_position and the
-- team/squad/platoon leader columns from migration 0001. Only rank_history
-- was missing, so that's all this touches. The Diversity NCO position needs
-- no schema change (position is a plain TEXT column, no CHECK constraint).
--
-- Safe to run against a database already at this schema (CREATE TABLE/INDEX
-- IF NOT EXISTS throughout).
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0002_rank_history.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0002.sql

CREATE TABLE IF NOT EXISTS rank_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cadet_id INTEGER NOT NULL REFERENCES cadets (id) ON DELETE CASCADE,
  make_number INTEGER CHECK (make_number IN (1, 2, 3)),
  previous_rank TEXT,
  new_rank TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rank_history_cadet ON rank_history (cadet_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_make ON rank_history (make_number);
