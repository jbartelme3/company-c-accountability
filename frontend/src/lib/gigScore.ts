// Computes the auto ("lowest gigs wins") standings behind
// AutoStandingsSection and the New-Cadet-of-the-Week callout — pure
// client-side aggregation over already-fetched data (unitsApi.compile +
// metricsApi.list), matching the rest of the app's pattern of fetching raw
// rows once and computing everything in the browser (see BannerSection,
// UnitPerformanceTab).
import type { MetricEntry, NewCadetStanding, UnitSummary } from "../types";
import { gigWeight, isGigScored, lineupGigWeight } from "../types";

export interface RankedUnit {
  leaderId: number;
  leaderName: string;
  weightedGigs: number;
  memberCount: number;
}

/**
 * Ranks each unit (team/squad/platoon) by total weighted gigs among its
 * members, restricted to `entries` dated within [start, end] — lowest wins,
 * ties broken alphabetically by leader name. New Cadet Lineup Gigs are
 * never counted (isGigScored excludes them, same as the unit compile
 * endpoint's totals).
 */
export function computeUnitStandings(units: UnitSummary[], entries: MetricEntry[], start: string, end: string): RankedUnit[] {
  const results = units.map((unit) => {
    const memberIds = new Set(unit.members.map((m) => m.id));
    let weightedGigs = 0;
    for (const entry of entries) {
      if (!memberIds.has(entry.cadet_id)) continue;
      if (entry.entry_date < start || entry.entry_date > end) continue;
      if (!isGigScored(entry.type)) continue;
      weightedGigs += gigWeight(entry.type);
    }
    return {
      leaderId: unit.leader.id,
      leaderName: `${unit.leader.first_name} ${unit.leader.last_name}`,
      weightedGigs,
      memberCount: unit.members.length,
    };
  });
  return results.sort((a, b) => a.weightedGigs - b.weightedGigs || a.leaderName.localeCompare(b.leaderName));
}

export interface RankedNewCadet {
  cadetId: number;
  name: string;
  weightedGigs: number;
}

/**
 * Ranks every current New Cadet by weighted lineup-gig total within
 * [start, end] — lowest wins, same weighting as the all-time leaderboard
 * (GET /api/new-cadets). `lineupEntries` should already be filtered to
 * type === "new_cadet_lineup_gig".
 */
export function computeNewCadetStandings(
  lineupEntries: MetricEntry[],
  cadets: NewCadetStanding[],
  start: string,
  end: string,
): RankedNewCadet[] {
  const totals = new Map<number, number>();
  for (const c of cadets) totals.set(c.id, 0);

  for (const entry of lineupEntries) {
    if (entry.entry_date < start || entry.entry_date > end) continue;
    if (!totals.has(entry.cadet_id)) continue; // only cadets currently at New Cadet rank
    totals.set(entry.cadet_id, (totals.get(entry.cadet_id) ?? 0) + lineupGigWeight(entry.lineup_gig_type));
  }

  const results = cadets.map((c) => ({
    cadetId: c.id,
    name: `${c.first_name} ${c.last_name}`,
    weightedGigs: totals.get(c.id) ?? 0,
  }));
  return results.sort((a, b) => a.weightedGigs - b.weightedGigs || a.name.localeCompare(b.name));
}
