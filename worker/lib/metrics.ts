// Single source of truth for the "Cadet Metrics" the Company C spec calls out —
// every category is tracked as its own individually-dated log per cadet.
//
// Positions/ranks below are cross-checked against the Culver Student Handbook's
// "CMA Leadership Positions" section and the Eagle Wings handbook's "Military
// Ranks & Insignias" chart, restricted to positions an Infantry (Company C)
// cadet could actually hold — the Artillery/Cavalry/Band-only billets
// (Motor Transportation Officer, Cannoneer, Stable Officer, M&A Officer/NCO)
// are excluded. Class-year eligibility and the secondary/collateral-duty list
// are Company C-specific, confirmed directly by Company C cadre.

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
  | "other";

export const METRIC_TYPES: MetricType[] = [
  "work_detail",
  "haircut",
  "laundry_gig",
  "absence",
  "daily_room_inspection_gig",
  "battalion_inspection_gig",
  "major_green_inspection_gig",
  "regimental_inspection_gig",
  "positive_epr",
  "negative_epr",
  "dc",
  "new_cadet_lineup_gig",
  "brc_inspection_gig",
  "drc_inspection_gig",
  "atv",
  "other",
];

export const METRIC_LABELS: Record<MetricType, string> = {
  work_detail: "Work Detail",
  haircut: "In-Unit Haircut",
  laundry_gig: "Laundry Gig",
  absence: "Absence",
  daily_room_inspection_gig: "Room Inspection",
  // Retired — replaced by BRC/DRC Gigs. Kept only so historical rows still
  // have a label; never offered for new entries (see METRIC_TYPE_ORDER in
  // frontend/src/types.ts).
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
};

// Purely cosmetic (badge color / quick-scan) grouping of whether an entry
// reflects well or poorly on a cadet, per the doc's "accountability" purpose.
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
};

// How many "gigs" a single entry of this type is worth — the weighting the
// Military Banner ("lowest gigs wins") is actually scored on. Used both to
// display weighted totals (Unit Performance tab charts/tables) and to
// compute the auto Team/Squad/Platoon of the Week/Month/Make standings (see
// frontend/src/lib/gigScore.ts). A type with no entry here isn't part of the
// gig-scoring system at all: haircut/positive_epr/negative_epr are
// informational ("Extra"), new_cadet_lineup_gig has its own separate
// per-sub-type weighting (LINEUP_GIG_TYPE_WEIGHT below) and is explicitly
// excluded from team/squad/platoon standings, and battalion_inspection_gig
// is retired.
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

// Freshman = 4th Classman, Sophomore = 3rd, Junior = 2nd, Senior = 1st.
// Ordered low-to-high, same convention as RANKS.
export type ClassYear = "Freshman" | "Sophomore" | "Junior" | "Senior";

export const CLASS_YEARS: ClassYear[] = ["Freshman", "Sophomore", "Junior", "Senior"];

export const CLASSMAN_LABELS: Record<ClassYear, string> = {
  Freshman: "4th Classman",
  Sophomore: "3rd Classman",
  Junior: "2nd Classman",
  Senior: "1st Classman",
};

export function formatClassYear(classYear: string | null): string {
  if (!classYear) return "—";
  const label = CLASSMAN_LABELS[classYear as ClassYear];
  return label ? `${classYear} (${label})` : classYear;
}

export interface CadetLike {
  position: string;
  rank: string | null;
}

// New Cadet Lineup Gigs are part of the New Cadet System (per the handbook,
// the onboarding program new arrivals go through before earning their branch
// insignia) — a cadet stops receiving them the moment they're promoted past
// the New Cadet rank (that promotion is what "passing" the New Cadet System
// means). Position is always Element while rank is New Cadet (see
// rankAfterPositionChange), so checking rank alone is sufficient; the
// position check is kept as a defensive belt-and-suspenders guard.
export function isEligibleForNewCadetLineupGig(cadet: CadetLike): boolean {
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
const UNIT_POSITIONS: PositionOption[] = [
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
const BATTALION_POSITIONS: PositionOption[] = [
  { label: "Battalion Armory Officer/NCO", abbrev: "ARMORER" },
  { label: "Battalion Supply Officer", abbrev: "BATSUP" },
  { label: "Battalion Athletic NCO", abbrev: "BATATH" },
  { label: "Battalion Operations Officer", abbrev: "BATOPS" },
  { label: "Battalion Adjutant", abbrev: "BATADJ" },
  { label: "Battalion Sergeant Major", abbrev: "BSM" },
  { label: "Battalion Commander", abbrev: "BATCOM" },
];

// Regimental staff level — filled by 1st/2nd Classmen from any unit,
// including Company C, per the handbook's leadership selection process.
const REGIMENTAL_POSITIONS: PositionOption[] = [
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
// position and rank, not a replacement for either. No minimum rank rules of
// their own; any cadet can hold any of these regardless of primary
// position/rank. "Unit Guidon" rotates within Company C roughly every make;
// "Battalion Guidon" is held by one company at a time, rotating among the
// battalion's companies about once every 3 makes.
export const SECONDARY_POSITIONS: PositionOption[] = [
  { label: "Branch Insignia Officer", abbrev: "BIO" },
  { label: "Branch Insignia NCO", abbrev: "BI-NCO" },
  { label: "Unit Academic Officer", abbrev: "ACAD" },
  { label: "Unit Athletic Officer", abbrev: "ATH" },
  { label: "Unit Clerk", abbrev: "CLERK" },
  { label: "Unit Armorer", abbrev: "U-ARM" },
  { label: "Unit Guidon", abbrev: "U-GUIDON" },
  { label: "Battalion Guidon", abbrev: "B-GUIDON" },
];

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
// "Commissioned Officer" is NOT a position/title in the handbook — it's a
// rank tier. The Uniform Regulations' Belts section ties it directly to
// rank: junior enlisted (Private/PFC/Lance Corporal) wear the White Waist
// Belt, NCOs (Corporal through Sergeant Major) wear the NCO Belt, and
// "cadets who are permanently commissioned officers" wear the Commissioned
// Officer Belt. A cadet is commissioned by achieving 2LT/1LT/Captain rank,
// independent of whatever billet (Platoon Leader, Battalion Adjutant, etc.)
// they're assigned to — so this checks rank, not position.
//
// The doc separately calls out Unit Commander, Unit Executive Officer,
// Operations Sergeant, and Unit First Sergeant by name (these are typically
// held by senior NCOs/officers in practice, but are matched on position here
// regardless of the rank on file, per the doc's literal wording).
//
// This is informational (a badge) — actual access control is the shared
// site password.
const OFFICER_RANKS = new Set(["Second Lieutenant", "First Lieutenant", "Captain"]);

const NAMED_CADRE_POSITIONS = new Set<string>([
  "Unit Commander",
  "Unit Executive Officer",
  "Operations Sergeant",
  "Unit First Sergeant",
]);

export function isCadre(cadet: CadetLike): boolean {
  return NAMED_CADRE_POSITIONS.has(cadet.position) || (!!cadet.rank && OFFICER_RANKS.has(cadet.rank));
}

// Ordered low-to-high — index in this array is the rank's seniority, per the
// Eagle Wings handbook's "Military Ranks & Insignias" chart (Ref: CMA Reg
// 3-4). Color Corporal is a sophomore-tier NCO rank between Lance Corporal
// and Corporal. Operations Sergeant, First Sergeant, Sergeant Major, and
// Regimental Sergeant Major are "acting" ranks — see ACTING_RANK_POSITIONS
// below — held only while currently serving in the matching billet.
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

function rankIndex(rank: string | null): number {
  if (!rank) return -1;
  const i = RANKS.indexOf(rank);
  return i === -1 ? -1 : i;
}

/** The higher (more senior) of two ranks, by RANKS order. */
export function higherRank(a: string | null, b: string | null): string | null {
  return rankIndex(a) >= rankIndex(b) ? a : b;
}

// Minimum rank required to hold each position — "position makes the rank":
// getting appointed to a position with a higher minimum than your current
// rank bumps you up to that minimum, but moving to a position with a *lower*
// minimum never demotes you; you keep whatever rank you've already earned
// (except for the acting-rank billets — see ACTING_RANK_POSITIONS /
// ACTING_RANK_BY_CLASS_YEAR). Confirmed directly by Company C cadre.
export const POSITION_MIN_RANK: Record<string, string> = {
  // Unit (Company C)
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

  // Infantry Battalion staff
  "Battalion Armory Officer/NCO": "Corporal",
  "Battalion Supply Officer": "Sergeant",
  "Battalion Athletic NCO": "Corporal",
  "Battalion Operations Officer": "First Lieutenant",
  "Battalion Adjutant": "First Lieutenant",
  "Battalion Sergeant Major": "Sergeant Major",
  "Battalion Commander": "First Lieutenant",

  // Regimental staff
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
  // Unit (Company C)
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

  // Infantry Battalion staff
  "Battalion Armory Officer/NCO": ["Junior"],
  "Battalion Supply Officer": ["Senior"],
  "Battalion Athletic NCO": ["Junior"],
  "Battalion Operations Officer": ["Senior"],
  "Battalion Adjutant": ["Senior"],
  "Battalion Sergeant Major": ["Junior"],
  "Battalion Commander": ["Senior"],

  // Regimental staff — RSM/ROSM/RCSM are Junior; every other regimental
  // billet (the core Commander/Adjutant/Operations trio, plus all 9
  // auxiliary staff/aide roles) is Senior-only, even though several of the
  // auxiliary roles keep a lower minimum *rank* (e.g. Sergeant) — class-year
  // eligibility and rank floor are separate constraints.
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
// field) is treated as unrestricted rather than ineligible — the check only
// bites once a class year is actually set, and it must then be consistent
// with the position.
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
// Senior Platoon Sergeant is (acting) Staff Sergeant. Same "only while
// currently in the position" behavior as ACTING_RANK_POSITIONS above.
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
 * (`oldPosition`, null for a brand-new cadet).
 *
 * - Moving into an acting-rank position (fixed, like Sergeant Major, or
 *   class-year-dependent, like Platoon Sergeant) always sets rank to exactly
 *   that position's acting rank — not a floor, it replaces whatever rank the
 *   cadet had, higher or lower.
 * - Moving out of one of them resets the baseline to "Sergeant" before
 *   applying the normal floor logic for the new position, so the acting rank
 *   isn't carried forward as a permanent achievement.
 * - Otherwise: whichever is higher of the current rank and the new
 *   position's minimum (the normal "position makes the rank, never demotes"
 *   rule) — never returns a lower rank than `currentRank`.
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

// The Military Banner: a weekly, regiment-wide competition (per the Eagle
// Wings handbook) scored on discipline/barracks/uniform standards — lowest
// gigs wins. Company C tracks two derived standings from that same weekly
// result: how it places among the 3 Infantry Battalion companies (Battalion
// Banner — weighted on Daily Room Inspection + Battalion Inspection Gigs),
// and how it places regiment-wide among all 9 units (Regimental Banner —
// weighted on Regimental Inspection Gigs, Laundry Gigs, DC's, and Battalion
// Banner placement). The actual weighting/scoring happens outside this app
// (it depends on other units' data this app doesn't have) — banner entries
// here are cadre's manual record of the announced weekly result, not a
// computed value.
//
// There are 3 makes per school year for this purpose (Company C's own usage,
// distinct from the 3 NCO + 2 officer makes cadet positions rotate through).
export const MAKE_NUMBERS = [1, 2, 3];

export const BATTALION_UNIT_COUNT = 3; // Companies A, B, C
export const REGIMENTAL_UNIT_COUNT = 9; // 3 Infantry companies + 3 Artillery batteries + Band + 2 Cavalry troops

// Small-unit organization: Company C is broken into Teams, Squads, and
// Platoons, each named after the cadet currently holding the corresponding
// leader billet (a Team is "so-and-so's Team", named after its Team Leader;
// a Squad after its Squad Leader; a Platoon after its Platoon Leader). Only
// the positions below actually participate in this system — everyone else
// (Unit NCO and up, and all Battalion/Regimental staff) sits outside it
// entirely and is never sorted into a team/squad/platoon.
//
// A cadet holding the leader billet for a unit type always IS that unit
// (self-referencing "leader" — enforced server-side, not user-editable);
// every other eligible position picks which leader's unit they belong to.
export type UnitType = "team" | "squad" | "platoon";

export const UNIT_TYPES: UnitType[] = ["team", "squad", "platoon"];

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  team: "Team",
  squad: "Squad",
  platoon: "Platoon",
};

// The position that *defines* (leads, and lends its name to) each unit type.
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

// The DB column on `cadets` that holds a cadet's assignment for each unit type.
export const UNIT_LEADER_COLUMN: Record<UnitType, "team_leader_id" | "squad_leader_id" | "platoon_leader_id"> = {
  team: "team_leader_id",
  squad: "squad_leader_id",
  platoon: "platoon_leader_id",
};
