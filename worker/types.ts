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
}

export interface MetricEntryRow {
  id: number;
  cadet_id: number;
  type: string;
  laundry_type: string | null;
  entry_date: string;
  note: string | null;
}
