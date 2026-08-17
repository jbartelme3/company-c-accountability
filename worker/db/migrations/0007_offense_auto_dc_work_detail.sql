-- Migration 0007: Offense entries auto-log linked DC/Work Detail entries.
--
-- Checking "DC?" and/or "Work Detail?" yes on an Offense now also inserts a
-- matching dc/work_detail metric_entries row (same cadet, date, and a note
-- explaining it came from the offense) — see worker/routes/metrics.ts.
-- source_offense_id links an auto-logged dc/work_detail row back to the
-- offense entry that created it, so editing/deleting the offense keeps its
-- children in sync (same idea as room_gig_group_id, but parent -> child
-- instead of a peer group).
--
-- Plain nullable column, no CHECK/NOT NULL — a bare ALTER TABLE ADD COLUMN
-- is safe here (same as migration 0005's room_gig_group_id).
--
-- Safe to run against a database already at this schema, with one caveat
-- shared with every prior migration here: ALTER TABLE ADD COLUMN errors
-- with "duplicate column name" if this column already exists — that just
-- means there's nothing left to do, not a real failure.
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0007_offense_auto_dc_work_detail.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0007.sql

ALTER TABLE metric_entries ADD COLUMN source_offense_id INTEGER REFERENCES metric_entries (id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_source_offense ON metric_entries (source_offense_id);
