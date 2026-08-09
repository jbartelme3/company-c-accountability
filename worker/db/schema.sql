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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cadets_name ON cadets (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_cadets_team_leader ON cadets (team_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_squad_leader ON cadets (squad_leader_id);
CREATE INDEX IF NOT EXISTS idx_cadets_platoon_leader ON cadets (platoon_leader_id);

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
      'battalion_inspection_gig',
      'major_green_inspection_gig',
      'regimental_inspection_gig',
      'positive_epr',
      'negative_epr',
      'dc',
      'new_cadet_lineup_gig'
    )
  ),
  -- Only set (and required) when type = 'laundry_gig': Mixed Laundry and Dry
  -- Cleaning are sub-types of a laundry gig, not their own metric categories.
  laundry_type TEXT CHECK (laundry_type IN ('mixed_laundry', 'dry_cleaning')),
  entry_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metric_entries_cadet ON metric_entries (cadet_id);
CREATE INDEX IF NOT EXISTS idx_metric_entries_type ON metric_entries (type);
CREATE INDEX IF NOT EXISTS idx_metric_entries_date ON metric_entries (entry_date);

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
