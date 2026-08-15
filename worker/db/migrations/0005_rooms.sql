-- Migration 0005: Rooms — cadets.room_number + metric_entries.room_gig_group_id.
--
-- Both are plain nullable columns (no CHECK/NOT NULL), so a bare
-- ALTER TABLE ADD COLUMN is safe here — unlike migration 0004's
-- metric_entries.type CHECK change, this doesn't need a table rebuild.
--
-- Checked remote's actual schema first (same approach as 0001-0004).
--
-- Safe to run against a database already at this schema, with one caveat
-- shared with every prior migration here: ALTER TABLE ADD COLUMN errors
-- with "duplicate column name" if these columns already exist — that just
-- means there's nothing left to do, not a real failure.
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0005_rooms.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0005.sql

ALTER TABLE cadets ADD COLUMN room_number TEXT;
CREATE INDEX IF NOT EXISTS idx_cadets_room ON cadets (room_number);

ALTER TABLE metric_entries ADD COLUMN room_gig_group_id TEXT;
CREATE INDEX IF NOT EXISTS idx_metric_entries_room_group ON metric_entries (room_gig_group_id);
