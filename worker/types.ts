export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SITE_PASSWORD: string;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  ALERT_EMAIL: string;
  CONDUCT_REPORT_WEBHOOK_SECRET: string;
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
  room_number: string | null;
}

export interface MetricEntryRow {
  id: number;
  cadet_id: number;
  type: string;
  laundry_type: string | null;
  lineup_gig_type: string | null;
  room_gig_group_id: string | null;
  offense_type: string | null;
  offense_detail: string | null;
  is_dc: number | null;
  is_work_detail: number | null;
  source_offense_id: number | null;
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

export interface RankHistoryRow {
  id: number;
  cadet_id: number;
  make_number: number | null;
  previous_rank: string | null;
  new_rank: string;
  note: string | null;
  created_at: string;
}

export interface ConductGigReportRow {
  id: number;
  reporter_name: string;
  cadet_id: number;
  entry_date: string;
  reasoning: string;
  source: string;
  created_at: string;
}

export interface MakePeriodRow {
  make_number: number;
  start_date: string;
  end_date: string;
  updated_at: string;
}
