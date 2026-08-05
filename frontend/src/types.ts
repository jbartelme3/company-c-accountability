export type MetricType =
  | "work_detail"
  | "haircut"
  | "laundry_gig"
  | "absence"
  | "battalion_inspection_gig"
  | "regimental_inspection_gig"
  | "positive_epr"
  | "negative_epr"
  | "dc"
  | "new_cadet_lineup_gig";

// Display order for the Metrics tab.
export const METRIC_TYPE_ORDER: MetricType[] = [
  "work_detail",
  "haircut",
  "laundry_gig",
  "absence",
  "battalion_inspection_gig",
  "regimental_inspection_gig",
  "positive_epr",
  "negative_epr",
  "dc",
  "new_cadet_lineup_gig",
];

export const METRIC_LABELS: Record<MetricType, string> = {
  work_detail: "Work Detail",
  haircut: "In-Unit Haircut",
  laundry_gig: "Laundry Gig",
  absence: "Absence",
  battalion_inspection_gig: "Battalion Inspection Gig",
  regimental_inspection_gig: "Regimental Inspection Gig",
  positive_epr: "Positive EPR",
  negative_epr: "Negative EPR",
  dc: "DC's (Disciplinary Confinement)",
  new_cadet_lineup_gig: "New Cadet Lineup Gig",
};

export type Polarity = "positive" | "neutral" | "negative";

export const METRIC_POLARITY: Record<MetricType, Polarity> = {
  work_detail: "neutral",
  haircut: "neutral",
  laundry_gig: "negative",
  absence: "negative",
  battalion_inspection_gig: "negative",
  regimental_inspection_gig: "negative",
  positive_epr: "positive",
  negative_epr: "negative",
  dc: "negative",
  new_cadet_lineup_gig: "negative",
};

export const POLARITY_TEXT_COLOR: Record<Polarity, string> = {
  positive: "text-green-700",
  neutral: "text-slate-600",
  negative: "text-red-700",
};

// Mixed Laundry and Dry Cleaning are sub-types of a Laundry Gig, not their own
// metric categories — every laundry_gig entry must specify which one it is.
export type LaundryType = "mixed_laundry" | "dry_cleaning";

export const LAUNDRY_TYPES: LaundryType[] = ["mixed_laundry", "dry_cleaning"];

export const LAUNDRY_TYPE_LABELS: Record<LaundryType, string> = {
  mixed_laundry: "Mixed Laundry",
  dry_cleaning: "Dry Cleaning",
};

// New Cadet Lineup Gigs only apply to cadets currently holding the New Cadet
// position at a New Cadet-tier rank.
const NEW_CADET_LINEUP_RANKS = new Set(["New Cadet", "Private", "Private First Class"]);

export function isEligibleForNewCadetLineupGig(cadet: Pick<Cadet, "position" | "rank">): boolean {
  return cadet.position === "New Cadet" && !!cadet.rank && NEW_CADET_LINEUP_RANKS.has(cadet.rank);
}

export interface PositionOption {
  label: string;
  abbrev: string;
}

// Unit (Company C) level.
export const UNIT_POSITIONS: PositionOption[] = [
  { label: "New Cadet", abbrev: "NC" },
  { label: "Team Leader", abbrev: "TL" },
  { label: "Squad Leader", abbrev: "SL" },
  { label: "Unit Clerk", abbrev: "CLERK" },
  { label: "Guidon Bearer", abbrev: "GUIDON" },
  { label: "Branch Insignia Officer", abbrev: "BIO" },
  { label: "Branch Insignia NCO", abbrev: "BI-NCO" },
  { label: "Unit Academic Officer", abbrev: "ACAD" },
  { label: "Unit Athletic Officer", abbrev: "ATH" },
  { label: "Unit Supply Officer", abbrev: "SUP" },
  { label: "Unit NCO", abbrev: "UNCO" },
  { label: "Platoon Sergeant", abbrev: "PS" },
  { label: "Platoon Leader", abbrev: "PL" },
  { label: "Operations Sergeant", abbrev: "OPS" },
  { label: "Unit First Sergeant", abbrev: "1SGT" },
  { label: "Unit Executive Officer", abbrev: "XO" },
  { label: "Unit Commander", abbrev: "UC" },
];

// Infantry Battalion staff level.
export const BATTALION_POSITIONS: PositionOption[] = [
  { label: "Battalion Armory Officer/NCO", abbrev: "ARMORER" },
  { label: "Battalion Supply Officer", abbrev: "BATSUP" },
  { label: "Battalion Athletic NCO", abbrev: "BATATH" },
  { label: "Battalion Operations Officer", abbrev: "BATOPS" },
  { label: "Battalion Adjutant", abbrev: "BATADJ" },
  { label: "Battalion Sergeant Major", abbrev: "BSM" },
  { label: "Battalion Commander", abbrev: "BATCOM" },
];

// Regimental staff level — filled by 1st/2nd Classmen from any unit,
// including Company C.
export const REGIMENTAL_POSITIONS: PositionOption[] = [
  { label: "Regimental Sergeant Major", abbrev: "RSM" },
  { label: "Regimental Operations Sergeant Major", abbrev: "ROSM" },
  { label: "Regimental Color Sergeant Major", abbrev: "RCSM" },
  { label: "Aide to Spiritual Life", abbrev: "AIDE-SL" },
  { label: "Aide to Admissions", abbrev: "AIDE-ADM" },
  { label: "Aide to Academics", abbrev: "AIDE-ACAD" },
  { label: "Technology Officer", abbrev: "TECH" },
  { label: "Diversity Officer", abbrev: "DIV" },
  { label: "Honor Officer", abbrev: "HONOR" },
  { label: "Drum Major", abbrev: "DM" },
  { label: "Regimental Supply Officer", abbrev: "REGSUP" },
  { label: "Regimental Athletic Officer", abbrev: "REGATH" },
  { label: "Regimental Operations Officer", abbrev: "REGOPS" },
  { label: "Regimental Adjutant", abbrev: "REGADJ" },
  { label: "Regimental Commander", abbrev: "REGCOM" },
];

export const POSITIONS: PositionOption[] = [...UNIT_POSITIONS, ...BATTALION_POSITIONS, ...REGIMENTAL_POSITIONS];

// Cadre per the spec: Commissioned Officers, Unit Commander, Executive
// Officer, Operations Sergeant, First Sergeant.
//
// "Commissioned Officer" is a rank tier, not a position/title — the
// handbook's Belts section ties it directly to rank (2LT/1LT/Captain wear
// the Commissioned Officer Belt), independent of whatever billet a cadet is
// assigned to. The doc separately names Unit Commander, Unit Executive
// Officer, Operations Sergeant, and Unit First Sergeant by position
// regardless of rank on file. is_cadre itself is computed server-side; these
// are exported for reference/documentation only.
export const OFFICER_RANKS = ["Second Lieutenant", "First Lieutenant", "Captain"];

export const NAMED_CADRE_POSITIONS = ["Unit Commander", "Unit Executive Officer", "Operations Sergeant", "Unit First Sergeant"];

export function formatPosition(position: string): string {
  const found = POSITIONS.find((p) => p.label === position);
  return found ? `${found.label} (${found.abbrev})` : position;
}

// Ordered low-to-high — index in this array is the rank's seniority. Color
// Corporal is a sophomore-tier NCO rank between Lance Corporal and Corporal.
export const RANKS = [
  "New Cadet",
  "Private",
  "Private First Class",
  "Lance Corporal",
  "Color Corporal",
  "Corporal",
  "Sergeant",
  "Sergeant 1st Class",
  "Second Lieutenant",
  "First Lieutenant",
  "Captain",
];

export const RANK_ABBREVIATIONS: Record<string, string> = {
  "New Cadet": "NC",
  Private: "PVT",
  "Private First Class": "PFC",
  "Lance Corporal": "LCPL",
  "Color Corporal": "CCPL",
  Corporal: "CPL",
  Sergeant: "SGT",
  "Sergeant 1st Class": "S1C",
  "Second Lieutenant": "2LT",
  "First Lieutenant": "1LT",
  Captain: "CPT",
};

export function formatRank(rank: string | null): string {
  if (!rank) return "—";
  const abbrev = RANK_ABBREVIATIONS[rank];
  return abbrev ? `${rank} (${abbrev})` : rank;
}

function rankIndex(rank: string | null): number {
  if (!rank) return -1;
  const i = RANKS.indexOf(rank);
  return i === -1 ? -1 : i;
}

/** The higher (more senior) of two ranks, by RANKS order. */
export function higherRank(a: string | null, b: string | null): string | null {
  return rankIndex(a) >= rankIndex(b) ? a : b;
}

// Minimum rank required to hold each position — mirrors worker/lib/metrics.ts.
// Confirmed directly by Company C cadre.
export const POSITION_MIN_RANK: Record<string, string> = {
  "New Cadet": "New Cadet",
  "Team Leader": "Private First Class",
  "Squad Leader": "Lance Corporal",
  "Unit Clerk": "Private",
  "Guidon Bearer": "Private First Class",
  "Branch Insignia Officer": "Second Lieutenant",
  "Branch Insignia NCO": "Corporal",
  "Unit Academic Officer": "Lance Corporal",
  "Unit Athletic Officer": "Lance Corporal",
  "Unit Supply Officer": "Corporal",
  "Unit NCO": "Corporal",
  "Platoon Sergeant": "Sergeant",
  "Platoon Leader": "Second Lieutenant",
  "Operations Sergeant": "Sergeant",
  "Unit First Sergeant": "Sergeant",
  "Unit Executive Officer": "First Lieutenant",
  "Unit Commander": "First Lieutenant",
  "Battalion Armory Officer/NCO": "Corporal",
  "Battalion Supply Officer": "Sergeant",
  "Battalion Athletic NCO": "Corporal",
  "Battalion Operations Officer": "First Lieutenant",
  "Battalion Adjutant": "First Lieutenant",
  "Battalion Sergeant Major": "Sergeant",
  "Battalion Commander": "First Lieutenant",
  "Regimental Sergeant Major": "Sergeant",
  "Regimental Operations Sergeant Major": "Sergeant",
  "Regimental Color Sergeant Major": "Sergeant",
  "Aide to Spiritual Life": "Sergeant",
  "Aide to Admissions": "Second Lieutenant",
  "Aide to Academics": "Sergeant",
  "Technology Officer": "Sergeant",
  "Diversity Officer": "First Lieutenant",
  "Honor Officer": "First Lieutenant",
  "Drum Major": "First Lieutenant",
  "Regimental Supply Officer": "Sergeant",
  "Regimental Athletic Officer": "Sergeant",
  "Regimental Operations Officer": "Captain",
  "Regimental Adjutant": "Captain",
  "Regimental Commander": "Captain",
};

/**
 * The rank a cadet should hold after being appointed to `position`, given
 * their current rank: whichever is higher of current rank and the
 * position's minimum. Never returns a lower rank than `currentRank`.
 */
export function rankAfterPositionChange(currentRank: string | null, position: string): string {
  const minimum = POSITION_MIN_RANK[position] ?? "New Cadet";
  return higherRank(currentRank, minimum) ?? minimum;
}

export interface Cadet {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  rank: string | null;
  is_cadre: boolean;
  negative_count?: number;
}

export interface MetricEntry {
  id: number;
  cadet_id: number;
  type: MetricType;
  laundry_type: LaundryType | null;
  entry_date: string;
  note: string | null;
  cadet_name?: string;
  cadet_position?: string;
}

export interface CadetProfile extends Cadet {
  metric_entries: MetricEntry[];
}
