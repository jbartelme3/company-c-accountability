-- Migration 0003: lineup gig sub-types + Conduct Gig Reports.
--
-- Checked remote's actual schema first (same approach as 0001/0002):
-- confirmed metric_entries had no lineup_gig_type column and
-- conduct_gig_reports didn't exist at all.
--
-- Safe to run against a database already at this schema (CREATE TABLE/INDEX
-- IF NOT EXISTS throughout; the ALTER TABLE line errors on a column that
-- already exists, same caveat as prior migrations — don't run this twice).
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0003_conduct_gigs.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0003.sql

-- Only set (and required) when type = 'new_cadet_lineup_gig'. A conduct gig
-- is weighted 3x wherever a lineup gig count is shown/ranked on (see
-- worker/routes/new-cadets.ts) — the other three sub-types count as 1.
ALTER TABLE metric_entries ADD COLUMN lineup_gig_type TEXT CHECK (lineup_gig_type IN ('room', 'uniform', 'conduct', 'common_knowledge'));

-- Conduct Gig Reports: a record of who reported a New Cadet for a conduct
-- issue, and why. 'manual' entries are typed in directly by cadre; 'form'
-- entries arrive via POST /api/webhooks/conduct-gig-report.
CREATE TABLE IF NOT EXISTS conduct_gig_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_name TEXT NOT NULL,
  cadet_id INTEGER NOT NULL REFERENCES cadets (id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'form')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conduct_reports_cadet ON conduct_gig_reports (cadet_id);
CREATE INDEX IF NOT EXISTS idx_conduct_reports_date ON conduct_gig_reports (entry_date);
