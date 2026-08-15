-- Company C Accountability schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS cadets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'Element',
  rank TEXT,
  -- Freshman/Sophomore/Junior/Senior (4th/3rd/2nd/1st Classman).
  class_year TEXT,
  -- Optional collateral duty held alongside the primary position/rank (e.g.
  -- Unit Clerk, Unit Guidon) — no eligibility rules of its own.
  secondary_position TEXT,
  -- Small-unit organization: Team/Squad/Platoon are each named after (and
  -- defined by) the cadet holding the matching leader billet. Each of these
  -- points at the *leader* cadet whose unit this cadet belongs to — a leader
  -- self-references their own id. Only Elements/Team Leaders/Squad
  -- Leaders/Platoon Sergeants/Platoon Leaders participate; everyone else
  -- leaves all three null. ON DELETE SET NULL so removing a leader cadet
  -- quietly dissolves the unit rather than failing.
  team_leader_id INTEGER REFERENCES cadets (id) ON DELETE SET NULL,
  squad_leader_id INTEGER REFERENCES cadets (id) ON DELETE SET NULL,
  platoon_leader_id INTEGER REFERENCES cadets (id) ON DELETE SET NULL,
  -- Physical dorm room ("301", etc). No eligibility rules — any cadet can
  -- have one, independent of position/rank. Two or more cadets sharing the
  -- same room_number are roommates for the Rooms tab and for auto-pairing
  -- Room Inspection gigs (see metric_entries.room_gig_group_id below).
  room_number TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cadets_name ON cadets (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_cadets_team_leader ON cadets (team_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_squad_leader ON cadets (squad_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_platoon_leader ON cadets (platoon_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_room ON cadets (room_number);

-- "New Cadet" is a rank, not a position — data fixup for rows written before
-- this distinction existed. Safe to rerun: a no-op once no rows are left with
-- the old position value.
UPDATE cadets SET position = 'Element' WHERE position = 'New Cadet';

-- Every "Cadet Metric" in the spec (work details, haircuts, laundry gigs,
-- absences, inspection gigs, EPRs, DCs, new cadet lineup gigs) is tracked here
-- as its own dated entry per cadet, so each category keeps an individual
-- history rather than a single running count.
CREATE TABLE IF NOT EXISTS metric_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cadet_id INTEGER NOT NULL REFERENCES cadets (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'work_detail',
      'haircut',
      'laundry_gig',
      'absence',
      'daily_room_inspection_gig',
      -- Retired — replaced by brc_inspection_gig/drc_inspection_gig below.
      -- Kept as a valid value only so any pre-existing rows don't break; no
      -- longer offered anywhere in the UI for new entries.
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
  -- Only set (and required) when type = 'laundry_gig': Mixed Laundry and Dry
  -- Cleaning are sub-types of a laundry gig, not their own metric categories.
  laundry_type TEXT CHECK (laundry_type IN ('mixed_laundry', 'dry_cleaning')),
  -- Only set (and required) when type = 'new_cadet_lineup_gig'. A conduct
  -- gig is weighted 3x wherever a lineup gig count is shown/ranked on (see
  -- worker/routes/new-cadets.ts) — the other three sub-types count as 1.
  lineup_gig_type TEXT CHECK (lineup_gig_type IN ('room', 'uniform', 'conduct', 'common_knowledge')),
  -- Set only on daily_room_inspection_gig ("Room Inspection") entries created
  -- for a cadet with roommates (see cadets.room_number): every entry sharing
  -- a group id is the same joint room event, auto-cloned one-per-roommate on
  -- create and kept in lockstep on edit/delete (see worker/routes/metrics.ts)
  -- — "if one roommate gets a room gig, they both do."
  room_gig_group_id TEXT,
  entry_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metric_entries_cadet ON metric_entries (cadet_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_type ON metric_entries (type);
CREATE INDEX IF NOT EXISTS idx_metric_entries_date ON metric_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_metric_entries_room_group ON metric_entries (room_gig_group_id);

-- Weekly Military Banner results — unit-level (Company C as a whole), not
-- per-cadet, so this is a separate table from metric_entries. Battalion rank
-- is 1-3 (among Companies A/B/C); Regimental rank is 1-9 (all Corps units).
-- Scores are optional numeric values, entered manually since the actual
-- weighting/scoring is computed outside this app.
CREATE TABLE IF NOT EXISTS banner_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  make_number INTEGER CHECK (make_number IN (1, 2, 3)),
  battalion_rank INTEGER CHECK (battalion_rank BETWEEN 1 AND 3),
  battalion_score REAL,
  regimental_rank INTEGER CHECK (regimental_rank BETWEEN 1 AND 9),
  regimental_score REAL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_banner_results_date ON banner_results (entry_date);
CREATE INDEX IF NOT EXISTS idx_banner_results_make ON banner_results (make_number);

-- Company C's own weekly "of the week" recognition for its small-unit
-- organization — Team of the Week, Squad of the Week, Platoon of the Week.
-- Each entry names the winning unit by its leader (a unit is always named
-- after whichever cadet holds that unit's leader billet — see cadets.
-- team_leader_id/squad_leader_id/platoon_leader_id), for a given week.
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

-- Rank changes are auto-logged here (see worker/routes/cadets.ts) every time
-- a cadet's rank actually changes, whether from a direct edit or a position
-- change bumping the rank floor. make_number ties a change to one of the 3
-- makes per school year (same convention as banner_results) but is optional
-- since not every rank edit happens to land on a specific make.
-- previous_rank is nullable to tolerate a null starting rank; new_rank never is.
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

-- Conduct Gig Reports: a record of who reported a New Cadet for a conduct
-- issue, and why. 'manual' entries are typed in directly by cadre; 'form'
-- entries arrive via POST /api/webhooks/conduct-gig-report (a bridge for a
-- Microsoft Forms + Power Automate flow cadre sets up separately — this app
-- has no direct Microsoft Forms integration). This log is purely a record of
-- reports; it does not itself add a Conduct Gig to a cadet's tally — cadre
-- reviews a report and, if warranted, logs the gig separately via the normal
-- Add flow (worker/routes/metrics.ts).
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

-- Make Periods: cadre-configured start/end date for each of the 3 makes per
-- school year, so gig totals can be auto-bucketed by make for the
-- Team/Squad/Platoon of the Make standings (see worker/routes/make-periods.ts
-- and frontend/src/lib/periods.ts). Not set until cadre fills it in via the
-- Unit Performance tab.
CREATE TABLE IF NOT EXISTS make_periods (
  make_number INTEGER PRIMARY KEY CHECK (make_number IN (1, 2, 3)),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tracks failed login attempts per IP for the shared-password gate. After 5
-- failed attempts, the IP is locked and a verification code is emailed to the
-- admin; only entering that code (POST /api/login/verify) clears the lock.
CREATE TABLE IF NOT EXISTS login_lockouts (
  ip TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_at TEXT,
  code_hash TEXT,
  code_expires_at TEXT,
  code_sent_at TEXT,
  code_attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
