import type {
  BannerResult,
  Cadet,
  CadetProfile,
  ConductGigReport,
  LaundryType,
  LineupGigType,
  MakePeriod,
  MetricEntry,
  MetricType,
  NewCadetStanding,
  UnitAward,
  UnitCompilation,
  UnitType,
} from "../types";

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string })?.error ?? res.statusText, data);
  }

  return data as T;
}

export { ApiError };

export interface LoginError {
  error: string;
  locked?: boolean;
  remainingAttempts?: number;
}

export const auth = {
  login: (password: string) => request<{ ok: true }>("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>("/api/logout", { method: "POST" }),
  me: () => request<{ authenticated: boolean }>("/api/me"),
  verifyCode: (code: string) => request<{ ok: true }>("/api/login/verify", { method: "POST", body: JSON.stringify({ code }) }),
  resendCode: () => request<{ ok: true }>("/api/login/resend-code", { method: "POST" }),
};

export const cadetsApi = {
  list: () => request<Cadet[]>("/api/cadets"),
  get: (id: number) => request<CadetProfile>(`/api/cadets/${id}`),
  create: (data: Partial<Cadet>) => request<Cadet>("/api/cadets", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Cadet> & { make_number?: number | null; rank_change_note?: string | null }) =>
    request<Cadet>(`/api/cadets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/cadets/${id}`, { method: "DELETE" }),
};

export const rankHistoryApi = {
  remove: (id: number) => request<void>(`/api/rank-history/${id}`, { method: "DELETE" }),
};

export const metricsApi = {
  list: (params?: { type?: MetricType; cadet_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set("type", params.type);
    if (params?.cadet_id) query.set("cadet_id", String(params.cadet_id));
    const qs = query.toString();
    return request<MetricEntry[]>(`/api/metrics${qs ? `?${qs}` : ""}`);
  },
  create: (data: {
    cadet_id: number;
    type: MetricType;
    laundry_type?: LaundryType | null;
    lineup_gig_type?: LineupGigType | null;
    quantity?: number;
    entry_date?: string;
    note?: string | null;
  }) => request<MetricEntry[]>("/api/metrics", { method: "POST", body: JSON.stringify(data) }),
  update: (
    id: number,
    data: Partial<{ entry_date: string; note: string | null; laundry_type: LaundryType | null; lineup_gig_type: LineupGigType | null }>,
  ) => request<MetricEntry>(`/api/metrics/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/metrics/${id}`, { method: "DELETE" }),
};

export const newCadetsApi = {
  list: () => request<NewCadetStanding[]>("/api/new-cadets"),
};

export const conductGigReportsApi = {
  list: () => request<ConductGigReport[]>("/api/conduct-gig-reports"),
  create: (data: { reporter_name: string; cadet_id: number; entry_date: string; reasoning: string }) =>
    request<ConductGigReport>("/api/conduct-gig-reports", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/conduct-gig-reports/${id}`, { method: "DELETE" }),
};

export const unitsApi = {
  compile: (type: UnitType) => request<UnitCompilation>(`/api/units/${type}`),
};

export const unitAwardsApi = {
  list: (type?: UnitType) => request<UnitAward[]>(`/api/unit-awards${type ? `?type=${type}` : ""}`),
  create: (data: { entry_date: string; unit_type: UnitType; leader_cadet_id: number; note?: string | null }) =>
    request<UnitAward>("/api/unit-awards", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ entry_date: string; leader_cadet_id: number; note: string | null }>) =>
    request<UnitAward>(`/api/unit-awards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/unit-awards/${id}`, { method: "DELETE" }),
};

export const makePeriodsApi = {
  list: () => request<MakePeriod[]>("/api/make-periods"),
  upsert: (makeNumber: number, data: { start_date: string; end_date: string }) =>
    request<MakePeriod>(`/api/make-periods/${makeNumber}`, { method: "PUT", body: JSON.stringify(data) }),
};

export const bannersApi = {
  list: () => request<BannerResult[]>("/api/banners"),
  create: (data: {
    entry_date: string;
    make_number?: number | null;
    battalion_rank?: number | null;
    battalion_score?: number | null;
    regimental_rank?: number | null;
    regimental_score?: number | null;
    note?: string | null;
  }) => request<BannerResult>("/api/banners", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Omit<BannerResult, "id">>) =>
    request<BannerResult>(`/api/banners/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/banners/${id}`, { method: "DELETE" }),
};
