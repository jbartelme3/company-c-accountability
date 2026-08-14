-- Migration 0004: gig restructure (BRC/DRC/ATV/Other metric types) + make_periods.
--
-- SQLite can't ALTER a CHECK constraint in place, so metric_entries has to be
-- rebuilt (standard 12-step pattern: create the new table, copy every row
-- across unchanged, drop the old table, rename, recreate indexes). Every
-- existing type value — including the now-retired 'battalion_inspection_gig'
-- — stays valid in the new CHECK so no data is touched or reclassified; the
-- 4 new values (brc_inspection_gig, drc_inspection_gig, atv, other) are
-- purely additive.
--
-- Checked remote's actual schema first (same approach as 0001-0003).
--
-- Safe to run against a database already at this schema: CREATE TABLE/INDEX
-- IF NOT EXISTS throughout, and the metric_entries rebuild only touches rows
-- (no CHECK to duplicate-error on like a bare ALTER TABLE would).
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0004_gig_restructure.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0004.sql

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
      'other'
    )
  ),
  laundry_type TEXT CHECK (laundry_type IN ('mixed_laundry', 'dry_cleaning')),
  lineup_gig_type TEXT CHECK (lineup_gig_type IN ('room', 'uniform', 'conduct', 'common_knowledge')),
  entry_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Explicit column list on both sides — remote's actual physical column
-- order doesn't match schema.sql's declared order (lineup_gig_type was
-- added later via ALTER TABLE ADD COLUMN, so it physically sits last), so a
-- bare `SELECT *` silently maps columns by position and corrupts data. Named
-- columns are immune to that regardless of physical order.
INSERT INTO metric_entries_new (id, cadet_id, type, laundry_type, lineup_gig_type, entry_date, note, created_at, updated_at)
SELECT id, cadet_id, type, laundry_type, lineup_gig_type, entry_date, note, created_at, updated_at FROM metric_entries;

DROP TABLE metric_entries;
ALTER TABLE metric_entries_new RENAME TO metric_entries;

CREATE INDEX IF NOT EXISTS idx_metric_entries_cadet ON metric_entries (cadet_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_type ON metric_entries (type);
CREATE INDEX IF NOT EXISTS idx_metric_entries_date ON metric_entries (entry_date);

-- make_periods: cadre-configured start/end date for each of the 3 makes per
-- school year, used to auto-bucket gig totals into Team/Squad/Platoon of the
-- Make standings.
CREATE TABLE IF NOT EXISTS make_periods (
  make_number INTEGER PRIMARY KEY CHECK (make_number IN (1, 2, 3)),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
