export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SITE_PASSWORD: string;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  ALERT_EMAIL: string;
}

export interface CadetRow {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  rank: string | null;
  class_year: string | null;
  secondary_position: string | null;
  team_leader_id: number | null;
  squad_leader_id: number | null;
  platoon_leader_id: number | null;
}

export interface MetricEntryRow {
  id: number;
  cadet_id: number;
  type: string;
  laundry_type: string | null;
  entry_date: string;
  note: string | null;
}

export interface BannerResultRow {
  id: number;
  entry_date: string;
  make_number: number | null;
  battalion_rank: number | null;
  battalion_score: number | null;
  regimental_rank: number | null;
  regimental_score: number | null;
  note: string | null;
}

export interface UnitAwardRow {
  id: number;
  entry_date: string;
  unit_type: string;
  leader_cadet_id: number;
  note: string | null;
}
