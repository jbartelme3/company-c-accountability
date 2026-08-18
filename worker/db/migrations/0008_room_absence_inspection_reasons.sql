-- Migration 0008: Reason dropdowns for Room Inspection, Absence, BRC/DRC/
-- Regimental Inspection, and Major Green Inspection gigs.
--
-- - daily_room_inspection_gig: room_gig_pi/room_gig_wardrobe (Y/N — pick one
--   or both) + room_gig_pi_point (which of the 8 points of P.I., only when
--   room_gig_pi is set — Eagle Wings handbook, "Cleanliness and Orderliness",
--   pp. 30-31).
-- - absence: absence_reason (BRC/DRC/Spiritual Life/All Corps). is_work_detail
--   is reused from the offense feature (migration 0007) — it already exists
--   on this table — to auto-log a matching work_detail entry when checked
--   yes on an absence, the same way it does on an offense.
-- - brc_inspection_gig/drc_inspection_gig/regimental_inspection_gig:
--   inspection_reason (Haircut/Shave/Uniform).
-- - major_green_inspection_gig: major_green_reason (Floor/Door Glass/
--   Bathroom/Mirror/General Orderly Appearance).
-- - source_offense_id is renamed to source_entry_id: it now links an
--   auto-logged dc/work_detail entry back to whichever entry created it
--   (an offense OR, as of this migration, an absence), not offense only.
--
-- Plain nullable columns with CHECK constraints that accept NULL (existing
-- rows all become NULL for every new column, and `col IN (...)` doesn't
-- reject NULL — SQLite only rejects a CHECK that evaluates to exactly
-- false), so — like migration 0007 — a bare ALTER TABLE ADD COLUMN is safe
-- here, no table rebuild needed. RENAME COLUMN needs SQLite 3.25+, which D1
-- has had for years.
--
-- Safe to run against a database already at this schema, with one caveat
-- shared with every prior migration here: ALTER TABLE ADD COLUMN errors
-- with "duplicate column name" if a column already exists — that just means
-- there's nothing left to do for that column, not a real failure. The
-- RENAME COLUMN step is NOT idempotent that way — if it's already been run,
-- re-running it will error "no such column: source_offense_id"; that's fine,
-- it means this migration already applied.
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0008_room_absence_inspection_reasons.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0008.sql

ALTER TABLE metric_entries RENAME COLUMN source_offense_id TO source_entry_id;

ALTER TABLE metric_entries ADD COLUMN room_gig_pi INTEGER CHECK (room_gig_pi IN (0, 1));
ALTER TABLE metric_entries ADD COLUMN room_gig_wardrobe INTEGER CHECK (room_gig_wardrobe IN (0, 1));
ALTER TABLE metric_entries ADD COLUMN room_gig_pi_point TEXT CHECK (
  room_gig_pi_point IN (
    'Bed properly made',
    'Floor swept clean',
    'Desk and bookshelves orderly',
    'Wardrobe closed',
    'Drapes open & window(s) unobstructed',
    'Wastebasket emptied',
    'Clean, brush-shined shoes lined under bed',
    'General orderly appearance'
  )
);
ALTER TABLE metric_entries ADD COLUMN absence_reason TEXT CHECK (absence_reason IN ('BRC', 'DRC', 'Spiritual Life', 'All Corps'));
ALTER TABLE metric_entries ADD COLUMN inspection_reason TEXT CHECK (inspection_reason IN ('Haircut', 'Shave', 'Uniform'));
ALTER TABLE metric_entries ADD COLUMN major_green_reason TEXT CHECK (
  major_green_reason IN ('Floor', 'Door Glass', 'Bathroom', 'Mirror', 'General Orderly Appearance')
);

DROP INDEX IF EXISTS idx_metric_entries_source_offense;
CREATE INDEX IF NOT EXISTS idx_metric_entries_source_entry ON metric_entries (source_entry_id);
