-- Migration 0001: Team/Squad/Platoon small-unit org system.
--
-- Applied to the remote D1 database on 2026-08-09. Before running, remote's
-- actual schema was checked via `wrangler d1 export --remote` rather than
-- assumed from git history — it turned out class_year, secondary_position,
-- banner_results, and the full metric_entries CHECK list (including
-- daily_room_inspection_gig/major_green_inspection_gig) were already live,
-- applied via a prior ad hoc `db:migrate:remote` run against schema.sql that
-- was never committed. Only the pieces below were actually missing, so
-- that's all this migration touches. If you're running this against a
-- database that's still on the schema from the repo's very first commit
-- (no class_year/secondary_position/banner_results at all), check its
-- current schema first — this file will not bring it up to date on its own.
--
-- Safe to run against a database already at this schema: every statement
-- here is idempotent (CREATE TABLE/INDEX IF NOT EXISTS, and ALTER TABLE ADD
-- COLUMN is the only exception — rerunning will error with "duplicate
-- column name" on the three ALTER lines below if they've already been
-- applied, which just means there's nothing left to do).
--
-- Run with:
--   wrangler d1 execute company-c-accountability --remote --file=worker/db/migrations/0001_team_squad_platoon.sql
--
-- Back up first:
--   wrangler d1 export company-c-accountability --remote --output=backup-before-0001.sql

-- cadets: the new team/squad/platoon leader columns. Each points at the
-- *leader* cadet whose unit this cadet belongs to (a leader self-references
-- their own id); only Elements/Team Leaders/Squad Leaders/Platoon
-- Sergeants/Platoon Leaders ever have these set.
ALTER TABLE cadets ADD COLUMN team_leader_id INTEGER REFERENCES cadets (id) ON DELETE SET NULL;
ALTER TABLE cadets ADD COLUMN squad_leader_id INTEGER REFERENCES cadets (id) ON DELETE SET NULL;
ALTER TABLE cadets ADD COLUMN platoon_leader_id INTEGER REFERENCES cadets (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cadets_team_leader ON cadets (team_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_squad_leader ON cadets (squad_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_platoon_leader ON cadets (platoon_leader_id);

-- "New Cadet" is a rank, not a position — anyone still holding it as a
-- position becomes an Element. Safe even if nothing matches.
UPDATE cadets SET position = 'Element' WHERE position = 'New Cadet';

-- unit_of_week_awards: Team/Squad/Platoon of the Week log.
CREATE TABLE IF NOT EXISTS unit_of_week_awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('team', 'squad', 'platoon')),
  leader_cadet_id INTEGER NOT NULL REFERENCES cadets (id) ON DELETE CASCADE,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unit_awards_date ON unit_of_week_awards (entry_date);
CREATE INDEX IF NOT EXISTS idx_unit_awards_type ON unit_of_week_awards (unit_type);
CREATE INDEX IF NOT EXISTS idx_unit_awards_leader ON unit_of_week_awards (leader_cadet_id);
