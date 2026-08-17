export type MetricType =
  | "work_detail"
  | "haircut"
  | "laundry_gig"
  | "absence"
  | "daily_room_inspection_gig"
  | "battalion_inspection_gig"
  | "major_green_inspection_gig"
  | "regimental_inspection_gig"
  | "positive_epr"
  | "negative_epr"
  | "dc"
  | "new_cadet_lineup_gig"
  | "brc_inspection_gig"
  | "drc_inspection_gig"
  | "atv"
  | "other"
  | "offense";

// Display order for the Metrics tab, cadet profile, and Add-entry dropdowns.
// battalion_inspection_gig is deliberately omitted — retired in favor of
// brc_inspection_gig/drc_inspection_gig, never offered for new entries.
export const METRIC_TYPE_ORDER: MetricType[] = [
  "offense",
  "work_detail",
  "haircut",
  "laundry_gig",
  "absence",
  "daily_room_inspection_gig",
  "brc_inspection_gig",
  "drc_inspection_gig",
  "major_green_inspection_gig",
  "regimental_inspection_gig",
  "positive_epr",
  "negative_epr",
  "dc",
  "atv",
  "other",
  "new_cadet_lineup_gig",
];

export const METRIC_LABELS: Record<MetricType, string> = {
  work_detail: "Work Detail",
  haircut: "In-Unit Haircut",
  laundry_gig: "Laundry Gig",
  absence: "Absence",
  daily_room_inspection_gig: "Room Inspection",
  battalion_inspection_gig: "Battalion Inspection Gig (legacy)",
  major_green_inspection_gig: "Major Green Inspection Gig",
  regimental_inspection_gig: "Regimental Inspection Gig",
  positive_epr: "Positive EPR",
  negative_epr: "Negative EPR",
  dc: "DC's (Disciplinary Confinement)",
  new_cadet_lineup_gig: "New Cadet Lineup Gig",
  brc_inspection_gig: "BRC Gig",
  drc_inspection_gig: "DRC Gig",
  atv: "ATV",
  other: "Other",
  offense: "Offense",
};

export type Polarity = "positive" | "neutral" | "negative";

export const METRIC_POLARITY: Record<MetricType, Polarity> = {
  work_detail: "neutral",
  haircut: "neutral",
  laundry_gig: "negative",
  absence: "negative",
  daily_room_inspection_gig: "negative",
  battalion_inspection_gig: "negative",
  major_green_inspection_gig: "negative",
  regimental_inspection_gig: "negative",
  positive_epr: "positive",
  negative_epr: "negative",
  dc: "negative",
  new_cadet_lineup_gig: "negative",
  brc_inspection_gig: "negative",
  drc_inspection_gig: "negative",
  atv: "negative",
  other: "neutral",
  offense: "negative",
};

export const POLARITY_TEXT_COLOR: Record<Polarity, string> = {
  positive: "text-green-700",
  neutral: "text-slate-600",
  negative: "text-red-700",
};

// How many "gigs" a single entry of this type is worth — the weighting the
// Military Banner ("lowest gigs wins") is actually scored on. Mirrors
// worker/lib/metrics.ts. Used both to show weighted totals on the Unit
// Performance tab and to compute the auto Team/Squad/Platoon of the
// Week/Month/Make standings (see lib/gigScore.ts). A type absent here isn't
// part of gig-scoring at all — haircut/positive_epr/negative_epr are
// informational ("Extra"), new_cadet_lineup_gig has its own separate
// per-sub-type weighting (LINEUP_GIG_TYPE_WEIGHT below) and is excluded from
// team/squad/platoon standings, battalion_inspection_gig is retired, and
// offense is a citizenship infraction, not a gig at all.
export const METRIC_GIG_WEIGHT: Partial<Record<MetricType, number>> = {
  daily_room_inspection_gig: 1,
  brc_inspection_gig: 3,
  drc_inspection_gig: 3,
  regimental_inspection_gig: 3,
  laundry_gig: 3,
  major_green_inspection_gig: 3,
  dc: 3,
  atv: 3,
  work_detail: 1,
  other: 1,
  absence: 1,
};

/** How many gigs one entry of `type` is worth — 1 for any type not in METRIC_GIG_WEIGHT (a plain count). */
export function gigWeight(type: MetricType): number {
  return METRIC_GIG_WEIGHT[type] ?? 1;
}

/** Whether `type` counts toward the auto gig-scoring standings (Team/Squad/Platoon of the Week/Month/Make). */
export function isGigScored(type: MetricType): boolean {
  return type in METRIC_GIG_WEIGHT;
}

// Mixed Laundry and Dry Cleaning are sub-types of a Laundry Gig, not their own
// metric categories — every laundry_gig entry must specify which one it is.
export type LaundryType = "mixed_laundry" | "dry_cleaning";

export const LAUNDRY_TYPES: LaundryType[] = ["mixed_laundry", "dry_cleaning"];

export const LAUNDRY_TYPE_LABELS: Record<LaundryType, string> = {
  mixed_laundry: "Mixed Laundry",
  dry_cleaning: "Dry Cleaning",
};

// New Cadet Lineup Gig sub-types. A Conduct Gig is weighted 3x everywhere a
// "lineup gig count" is shown or ranked on (the New Cadets leaderboard, a
// cadet's metric badge) — the other three sub-types each count as 1.
export type LineupGigType = "room" | "uniform" | "conduct" | "common_knowledge";

export const LINEUP_GIG_TYPES: LineupGigType[] = ["room", "uniform", "conduct", "common_knowledge"];

export const LINEUP_GIG_TYPE_LABELS: Record<LineupGigType, string> = {
  room: "Room",
  uniform: "Uniform",
  conduct: "Conduct Gig",
  common_knowledge: "Common Knowledge",
};

export const LINEUP_GIG_TYPE_WEIGHT: Record<LineupGigType, number> = {
  room: 1,
  uniform: 1,
  conduct: 3,
  common_knowledge: 1,
};

export function lineupGigWeight(lineupGigType: string | null): number {
  return LINEUP_GIG_TYPE_WEIGHT[lineupGigType as LineupGigType] ?? 1;
}

// Culver's citizenship infraction categories — mirrors worker/lib/metrics.ts
// (Culver Student Handbook, "Types of Infractions (I-IV)", pp. 65-68). Type I
// is the most serious (potential dismissal), Type IV the least.
export type OffenseType = "Type I" | "Type II" | "Type III" | "Type IV";

export const OFFENSE_TYPES: OffenseType[] = ["Type I", "Type II", "Type III", "Type IV"];

export const OFFENSE_TYPE_LABELS: Record<OffenseType, string> = {
  "Type I": "Type I — most serious, normally a Disciplinary Committee meeting, often dismissal or Citizenship Warning",
  "Type II": "Type II — similar to Type I but a lesser degree; Citizenship Warning, Full Restrictions, or less severe",
  "Type III": "Type III — normally Full Restrictions or Disciplinary Confinement",
  "Type IV": "Type IV — a reprimand or other corrective action short of Full Restrictions/DC",
};

// The specific infractions listed under each type, verbatim from the
// handbook's bullet lists. Each type's list there also ends with "Other
// conduct falling generally within the description of a Type X violation as
// determined by Student Life," represented here as the single OFFENSE_DETAIL_OTHER
// freeform option rather than a pickable duplicate of that catch-all phrase.
export const OFFENSE_DETAILS: Record<OffenseType, string[]> = {
  "Type I": [
    "Accumulation of Type II, III, and/or IV Infractions",
    "Harassment/Hazing/Bullying/Substantial Disrespect",
    "Chemical Substance Violation",
    "Repeated use or possession of nicotine products",
    "Production, possession or use of false identification",
    "Inappropriate sexual behavior",
    "Endangering others or oneself",
    "Theft",
    "Tampering with the alarm system, fire extinguishers, or placing a false 911 call",
    "Misuse or mistreatment of another's property",
    "Condoning or failing to report serious violations",
    "Failure to comply with the stipulations of Citizenship Warning",
    "Violation of the Network Responsible Use Policy",
    "Possession of unauthorized Academies' keys or unauthorized entry",
    "Compromising the welfare of the Academies through inappropriate behavior",
    "Absent without leave",
  ],
  "Type II": [
    "Accumulation of Type III and/or IV infractions",
    "Off limits (flagrant and/or off campus)",
    "Use/possession of nicotine products (1st and 2nd offense)",
    "Failure to comply with Full Restrictions",
    "Repeated class absences",
    "Fighting, physical contact or threats",
    "Auto Violation (driving/riding/transporting/storage)",
    "Absent required duty, formation or meeting",
    "Honor violations other than theft, not limited to dishonesty, cheating or plagiarism",
    "Abuse of authority",
    "Safety violation",
    "Failure to report violations",
    "After taps violation - out of living unit",
    "Excessive class lates",
    "Disrespect or disobedience",
    "Repeated classroom misconduct",
    "Guest in living unit after taps",
    "Late returning from leave",
  ],
  "Type III": [
    "Accumulation of Type IV infractions",
    "Neglect of duty or neglect of duty by a leader",
    "General misconduct, unbecoming manners or language",
    "Class or tutorial absence (1st and 2nd offense)",
    "Entering another's unoccupied room",
    "Disobedience or disrespect",
    "Failure to follow leave or permit procedures",
    "Absent required duty, formation, or meeting",
    "Violation of the New Cadet System",
    "Study time violation",
    "Off limits (on campus)",
    "Public display of affection (PDA)",
    "Failure to report violations",
    "Physical contact or threats",
    "Failure to observe corrective action",
    "Classroom or library misconduct",
    "Cell Phone Violation",
    "After taps violation - out of room",
    "Late to class or tutorial",
    "Unauthorized item in room",
    "Violation of the Network Acceptable Use Policy",
  ],
  "Type IV": [
    "Neglect or improper performance of duty",
    "Failure to follow instructions",
    "Room condition or arrangement violation",
    "Late or absent required duty, formation, meeting or meal",
    "General misconduct",
    "Failure to sign in or out",
    "After taps violation (in room)",
    "Violation of the New Cadet System",
    "Personal appearance violation",
  ],
};

// Sentinel UI value for "Other" — not stored as-is; the freeform text cadre
// types replaces it in offense_detail (see api/client.ts metricsApi.create).
export const OFFENSE_DETAIL_OTHER = "Other";

// Freshman = 4th Classman, Sophomore = 3rd, Junior = 2nd, Senior = 1st.
export type ClassYear = "Freshman" | "Sophomore" | "Junior" | "Senior";

export const CLASS_YEARS: ClassYear[] = ["Freshman", "Sophomore", "Junior", "Senior"];

export const CLASSMAN_LABELS: Record<ClassYear, string> = {
  Freshman: "4th Classman",
  Sophomore: "3rd Classman",
  Junior: "2nd Classman",
  Senior: "1st Classman",
};

export function formatClassYear(classYear: string | null): string {
  if (!classYear) return "-";
  const label = CLASSMAN_LABELS[classYear as ClassYear];
  return label ? `${classYear} (${label})` : classYear;
}

// New Cadet Lineup Gigs are part of the New Cadet System — a cadet stops
// receiving them the moment they're promoted past the New Cadet rank (that
// promotion is what "passing" the New Cadet System means).
export function isEligibleForNewCadetLineupGig(cadet: Pick<Cadet, "position" | "rank">): boolean {
  return cadet.position === "Element" && cadet.rank === "New Cadet";
}

export interface PositionOption {
  label: string;
  abbrev: string;
}

// Unit (Company C) level — primary leadership/command billets only. Branch
// Insignia Officer/NCO, Unit Academic/Athletic Officer, Unit Clerk, and
// Guidon Bearer are collateral duties held *alongside* one of these, not
// separate primary positions — see SECONDARY_POSITIONS. Unit Supply Officer
// is folded into Unit NCO in Company C.
export const UNIT_POSITIONS: PositionOption[] = [
  { label: "Element", abbrev: "ELM" },
  { label: "Team Leader", abbrev: "TL" },
  { label: "Squad Leader", abbrev: "SL" },
  { label: "Unit NCO", abbrev: "UNCO" },
  { label: "Diversity NCO", abbrev: "DIVNCO" },
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

// Secondary/collateral duties — held in parallel with a cadet's primary
// position and rank, not a replacement for either. No minimum rank or
// class-year rules of their own; any cadet can hold any of these regardless
// of primary position/rank. "Unit Guidon" rotates within Company C roughly
// every make; "Battalion Guidon" is held by one company at a time, rotating
// among the battalion's companies about once every 3 makes.
export const SECONDARY_POSITIONS: PositionOption[] = [
  { label: "Branch Insignia Officer", abbrev: "BIO" },
  { label: "Branch Insignia NCO", abbrev: "BI-NCO" },
  { label: "Unit Academic Officer", abbrev: "ACAD" },
  { label: "Unit Athletic Officer", abbrev: "ATH" },
  { label: "Unit Clerk", abbrev: "CLERK" },
  { label: "Unit Armorer", abbrev: "U-ARM" },
  { label: "Unit Guidon", abbrev: "U-GUIDON" },
  { label: "Battalion Guidon", abbrev: "B-GUIDON" },
  // A Unit NCO's primary roster position is usually still "Element" — Unit
  // NCO is held in tangent as a collateral duty, not a promotion out of the
  // team/squad/platoon structure (confirmed by Company C cadre). Distinct
  // from the primary "Unit NCO" position (UNIT_POSITIONS above, abbrev
  // "UNCO") for whichever rarer case it's held as a full-time billet instead.
  { label: "Unit NCO", abbrev: "U-NCO" },
];

export function formatSecondaryPosition(position: string | null): string {
  if (!position) return "-";
  const found = SECONDARY_POSITIONS.find((p) => p.label === position);
  return found ? `${found.label} (${found.abbrev})` : position;
}

// The only secondary duties with a class-year restriction: both guidon
// bearer roles are Sophomore-only. Every other secondary duty is unrestricted.
export const SECONDARY_POSITION_CLASS_YEARS: Record<string, ClassYear[]> = {
  "Unit Guidon": ["Sophomore"],
  "Battalion Guidon": ["Sophomore"],
};

export function isClassYearEligibleForSecondaryPosition(classYear: string | null, secondaryPosition: string | null): boolean {
  if (!secondaryPosition) return true;
  const allowed = SECONDARY_POSITION_CLASS_YEARS[secondaryPosition];
  if (!allowed || !classYear) return true;
  return allowed.includes(classYear as ClassYear);
}

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

// Ordered low-to-high — index in this array is the rank's seniority, per the
// Eagle Wings handbook's "Military Ranks & Insignias" chart. Color Corporal
// is a sophomore-tier NCO rank between Lance Corporal and Corporal.
// Operations Sergeant, First Sergeant, Sergeant Major, and Regimental
// Sergeant Major are "acting" ranks — see ACTING_RANK_POSITIONS below — held
// only while currently serving in the matching billet.
export const RANKS = [
  "New Cadet",
  "Private",
  "Private First Class",
  "Lance Corporal",
  "Color Corporal",
  "Corporal",
  "Sergeant",
  "Staff Sergeant",
  "Operations Sergeant",
  "First Sergeant",
  "Sergeant Major",
  "Regimental Sergeant Major",
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
  "Staff Sergeant": "SSG",
  "Operations Sergeant": "OPS",
  "First Sergeant": "1SGT",
  "Sergeant Major": "SGM",
  "Regimental Sergeant Major": "RSM",
  "Second Lieutenant": "2LT",
  "First Lieutenant": "1LT",
  Captain: "CPT",
};

export function formatRank(rank: string | null): string {
  if (!rank) return "-";
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
  Element: "New Cadet",
  "Team Leader": "Private First Class",
  "Squad Leader": "Lance Corporal",
  "Unit NCO": "Corporal",
  "Diversity NCO": "Corporal",
  "Platoon Sergeant": "Sergeant", // class-year dependent in practice — see ACTING_RANK_BY_CLASS_YEAR
  "Platoon Leader": "Second Lieutenant",
  "Operations Sergeant": "Operations Sergeant",
  "Unit First Sergeant": "First Sergeant",
  "Unit Executive Officer": "First Lieutenant",
  "Unit Commander": "First Lieutenant",
  "Battalion Armory Officer/NCO": "Corporal",
  "Battalion Supply Officer": "Sergeant",
  "Battalion Athletic NCO": "Corporal",
  "Battalion Operations Officer": "First Lieutenant",
  "Battalion Adjutant": "First Lieutenant",
  "Battalion Sergeant Major": "Sergeant Major",
  "Battalion Commander": "First Lieutenant",
  "Regimental Sergeant Major": "Regimental Sergeant Major",
  "Regimental Operations Sergeant Major": "Sergeant Major",
  "Regimental Color Sergeant Major": "Sergeant Major",
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

// Which class year(s) may hold each primary position, per Company C. A
// position not listed here has no class-year restriction.
export const POSITION_CLASS_YEARS: Record<string, ClassYear[]> = {
  Element: ["Freshman", "Sophomore", "Junior"],
  "Team Leader": ["Freshman", "Sophomore", "Junior", "Senior"],
  "Squad Leader": ["Sophomore", "Junior", "Senior"],
  "Unit NCO": ["Junior"],
  "Platoon Sergeant": ["Junior", "Senior"],
  "Platoon Leader": ["Senior"],
  "Operations Sergeant": ["Junior"],
  "Unit First Sergeant": ["Junior"],
  "Unit Executive Officer": ["Senior"],
  "Unit Commander": ["Senior"],
  "Battalion Armory Officer/NCO": ["Junior"],
  "Battalion Supply Officer": ["Senior"],
  "Battalion Athletic NCO": ["Junior"],
  "Battalion Operations Officer": ["Senior"],
  "Battalion Adjutant": ["Senior"],
  "Battalion Sergeant Major": ["Junior"],
  "Battalion Commander": ["Senior"],
  "Regimental Sergeant Major": ["Junior"],
  "Regimental Operations Sergeant Major": ["Junior"],
  "Regimental Color Sergeant Major": ["Junior"],
  "Aide to Spiritual Life": ["Senior"],
  "Aide to Admissions": ["Senior"],
  "Aide to Academics": ["Senior"],
  "Technology Officer": ["Senior"],
  "Diversity Officer": ["Senior"],
  "Honor Officer": ["Senior"],
  "Drum Major": ["Senior"],
  "Regimental Supply Officer": ["Senior"],
  "Regimental Athletic Officer": ["Senior"],
  "Regimental Operations Officer": ["Senior"],
  "Regimental Adjutant": ["Senior"],
  "Regimental Commander": ["Senior"],
};

// A cadet with no class year on file yet (e.g. legacy data predating this
// field) is treated as unrestricted rather than ineligible.
export function isClassYearEligibleForPosition(classYear: string | null, position: string): boolean {
  const allowed = POSITION_CLASS_YEARS[position];
  if (!allowed || !classYear) return true;
  return allowed.includes(classYear as ClassYear);
}

// Operations Sergeant, Unit First Sergeant, Battalion/Regimental Sergeant
// Major, and Regimental Operations/Color Sergeant Major are "acting" ranks:
// unlike every other position (which sets a permanent floor you never drop
// below), these are held only while *currently* serving in the matching
// billet. Leaving the billet reverts to a flat "Sergeant" baseline — not
// whatever rank the cadet held before taking the billet — before the normal
// floor logic applies to whatever position comes next.
export const ACTING_RANK_POSITIONS: Record<string, string> = {
  "Operations Sergeant": "Operations Sergeant",
  "Unit First Sergeant": "First Sergeant",
  "Battalion Sergeant Major": "Sergeant Major",
  "Regimental Operations Sergeant Major": "Sergeant Major",
  "Regimental Color Sergeant Major": "Sergeant Major",
  "Regimental Sergeant Major": "Regimental Sergeant Major",
};

// Platoon Sergeant is also an acting rank, but which one depends on the
// cadet's class year: a Junior Platoon Sergeant is (acting) Sergeant, a
// Senior Platoon Sergeant is (acting) Staff Sergeant.
export const ACTING_RANK_BY_CLASS_YEAR: Record<string, Partial<Record<ClassYear, string>>> = {
  "Platoon Sergeant": {
    Junior: "Sergeant",
    Senior: "Staff Sergeant",
  },
};

function isActingPosition(position: string | null): boolean {
  if (!position) return false;
  return !!ACTING_RANK_POSITIONS[position] || !!ACTING_RANK_BY_CLASS_YEAR[position];
}

function actingRankFor(position: string, classYear: string | null): string | null {
  const fixed = ACTING_RANK_POSITIONS[position];
  if (fixed) return fixed;
  const byClass = ACTING_RANK_BY_CLASS_YEAR[position];
  if (byClass && classYear) return byClass[classYear as ClassYear] ?? null;
  return null;
}

/**
 * The rank a cadet should hold after being appointed to `newPosition`, given
 * their current rank, class year, and the position they're moving from
 * (`oldPosition`, null for a brand-new cadet). See ACTING_RANK_POSITIONS /
 * ACTING_RANK_BY_CLASS_YEAR for the exception to the normal "never demotes"
 * rule.
 */
export function rankAfterPositionChange(
  currentRank: string | null,
  oldPosition: string | null,
  newPosition: string,
  classYear: string | null,
): string {
  const newActingRank = actingRankFor(newPosition, classYear);
  if (newActingRank) return newActingRank;

  const wasActing = isActingPosition(oldPosition);
  const baseline = wasActing ? "Sergeant" : currentRank;
  const minimum = POSITION_MIN_RANK[newPosition] ?? "New Cadet";
  return higherRank(baseline, minimum) ?? minimum;
}

export interface Cadet {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  rank: string | null;
  class_year: string | null;
  secondary_position: string | null;
  is_cadre: boolean;
  negative_count?: number;
  team_leader_id: number | null;
  squad_leader_id: number | null;
  platoon_leader_id: number | null;
  room_number: string | null;
}

export interface NewCadetStanding extends Cadet {
  lineup_gig_count: number;
}

export interface MetricEntry {
  id: number;
  cadet_id: number;
  type: MetricType;
  laundry_type: LaundryType | null;
  lineup_gig_type: LineupGigType | null;
  room_gig_group_id: string | null;
  offense_type: OffenseType | null;
  offense_detail: string | null;
  is_dc: boolean | null;
  is_work_detail: boolean | null;
  source_offense_id: number | null;
  entry_date: string;
  note: string | null;
  cadet_name?: string;
  cadet_position?: string;
}

export interface RankHistoryEntry {
  id: number;
  cadet_id: number;
  make_number: number | null;
  previous_rank: string | null;
  new_rank: string;
  note: string | null;
  created_at: string;
}

export interface ConductGigReport {
  id: number;
  reporter_name: string;
  cadet_id: number;
  cadet_name: string;
  entry_date: string;
  reasoning: string;
  source: "manual" | "form";
  created_at: string;
}

export interface CadetProfile extends Cadet {
  metric_entries: MetricEntry[];
  team_leader_name: string | null;
  squad_leader_name: string | null;
  platoon_leader_name: string | null;
  rank_history: RankHistoryEntry[];
}

// The Military Banner: a weekly, regiment-wide competition scored on
// discipline/barracks/uniform standards — lowest gigs wins. Company C tracks
// two derived standings from that same weekly result: Battalion Banner (rank
// among the 3 Infantry companies, weighted on Daily Room Inspection +
// Battalion Inspection Gigs) and Regimental Banner (rank among all 9 units,
// weighted on Regimental Inspection Gigs, Laundry Gigs, DC's, and Battalion
// Banner placement). Weighting/scoring happens outside this app — entries
// here are cadre's manual record of the announced weekly result.
export const MAKE_NUMBERS = [1, 2, 3];

export const BATTALION_UNIT_COUNT = 3; // Companies A, B, C
export const REGIMENTAL_UNIT_COUNT = 9; // 3 Infantry companies + 3 Artillery batteries + Band + 2 Cavalry troops

export interface BannerResult {
  id: number;
  entry_date: string;
  make_number: number | null;
  battalion_rank: number | null;
  battalion_score: number | null;
  regimental_rank: number | null;
  regimental_score: number | null;
  note: string | null;
}

// Small-unit organization: Company C is broken into Teams, Squads, and
// Platoons, each named after the cadet currently holding the corresponding
// leader billet. Only the positions below participate — everyone else (Unit
// NCO and up, and all Battalion/Regimental staff) sits outside the system
// entirely. A cadet holding a unit's leader billet always *is* that unit
// (self-assigned server-side); every other eligible position picks which
// leader's unit they belong to via a dropdown.
export type UnitType = "team" | "squad" | "platoon";

export const UNIT_TYPES: UnitType[] = ["team", "squad", "platoon"];

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  team: "Team",
  squad: "Squad",
  platoon: "Platoon",
};

// The position that defines (leads, and lends its name to) each unit type.
export const LEADER_POSITION_FOR_UNIT: Record<UnitType, string> = {
  team: "Team Leader",
  squad: "Squad Leader",
  platoon: "Platoon Leader",
};

const TEAM_ELIGIBLE_POSITIONS = new Set(["Element", "Team Leader"]);
const SQUAD_ELIGIBLE_POSITIONS = new Set(["Element", "Team Leader", "Squad Leader"]);
const PLATOON_ELIGIBLE_POSITIONS = new Set([
  "Element",
  "Team Leader",
  "Squad Leader",
  "Platoon Sergeant",
  "Platoon Leader",
]);

export function isTeamEligible(position: string): boolean {
  return TEAM_ELIGIBLE_POSITIONS.has(position);
}

export function isSquadEligible(position: string): boolean {
  return SQUAD_ELIGIBLE_POSITIONS.has(position);
}

export function isPlatoonEligible(position: string): boolean {
  return PLATOON_ELIGIBLE_POSITIONS.has(position);
}

export const UNIT_ELIGIBILITY: Record<UnitType, (position: string) => boolean> = {
  team: isTeamEligible,
  squad: isSquadEligible,
  platoon: isPlatoonEligible,
};

export const UNIT_LEADER_FIELD: Record<UnitType, "team_leader_id" | "squad_leader_id" | "platoon_leader_id"> = {
  team: "team_leader_id",
  squad: "squad_leader_id",
  platoon: "platoon_leader_id",
};

export interface UnitSummary {
  leader: Cadet;
  members: Cadet[];
  metric_totals: Record<MetricType, number>;
  negative_total: number;
}

export interface UnitCompilation {
  units: UnitSummary[];
  unassigned: Cadet[];
}

export interface UnitAward {
  id: number;
  entry_date: string;
  unit_type: UnitType;
  leader_cadet_id: number;
  leader_name: string;
  note: string | null;
}

// Cadre-configured start/end date for each of the 3 makes per school year —
// lets the auto Team/Squad/Platoon of the Make standings bucket gig entries
// by make. Not set until cadre fills it in (Unit Performance tab).
export interface MakePeriod {
  make_number: number;
  start_date: string;
  end_date: string;
}
