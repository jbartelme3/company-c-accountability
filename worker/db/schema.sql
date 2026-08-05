-- Company C Accountability schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS cadets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'New Cadet',
  rank TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cadets_name ON cadets (last_name, first_name);

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
      'battalion_inspection_gig',
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
