-- Migration 0006: Offense metric type (Culver Type I-IV citizenship infractions).
--
-- Adds 'offense' to metric_entries' type CHECK, plus offense_type,
-- offense_detail, is_dc, is_work_detail columns. The type CHECK change means
-- a table rebuild (same as migration 0004), with the same explicit-column
-- INSERT...SELECT that migration discovered was necessary — remote's
-- physical column order doesn't match schema.sql's declared order (columns
-- added later via ALTER TABLE sit at the end physically), so a bare
-- `SELECT *` would silently corrupt data.
--
-- Checked remote's actual schema first (same approach as 0001-0005).
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0006_offense.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0006.sql

CREATE TABLE metric_entries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cadet_id INTEGER NOT NULL REFERENCES cadets (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'work_detail',
      'haircut',
      'laundry_gig',
      'absence',
      'daily_room_inspection_gig',
      'battalion_inspection_gig',
      'major_green_inspection_gig',
      'regimental_inspection_gig',
      'positive_epr',
      'negative_epr',
      'dc',
      'new_cadet_lineup_gig',
      'brc_inspection_gig',
      'drc_inspection_gig',
      'atv',
      'other',
      'offense'
    )
  ),
  laundry_type TEXT CHECK (laundry_type IN ('mixed_laundry', 'dry_cleaning')),
  lineup_gig_type TEXT CHECK (lineup_gig_type IN ('room', 'uniform', 'conduct', 'common_knowledge')),
  room_gig_group_id TEXT,
  offense_type TEXT CHECK (offense_type IN ('Type I', 'Type II', 'Type III', 'Type IV')),
  offense_detail TEXT,
  is_dc INTEGER CHECK (is_dc IN (0, 1)),
  is_work_detail INTEGER CHECK (is_work_detail IN (0, 1)),
  entry_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO metric_entries_new (id, cadet_id, type, laundry_type, lineup_gig_type, room_gig_group_id, entry_date, note, created_at, updated_at)
SELECT id, cadet_id, type, laundry_type, lineup_gig_type, room_gig_group_id, entry_date, note, created_at, updated_at FROM metric_entries;

DROP TABLE metric_entries;
ALTER TABLE metric_entries_new RENAME TO metric_entries;

CREATE INDEX IF NOT EXISTS idx_metric_entries_cadet ON metric_entries (cadet_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_type ON metric_entries (type);
CREATE INDEX IF NOT EXISTS idx_metric_entries_date ON metric_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_metric_entries_room_group ON metric_entries (room_gig_group_id);
