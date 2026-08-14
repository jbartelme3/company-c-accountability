import { useState } from "react";
import type { MakePeriod, MetricEntry, NewCadetStanding } from "../types";
import { computeNewCadetStandings, type RankedNewCadet } from "../lib/gigScore";
import { currentIsoWeekRange, currentMonthRange, findCurrentMake } from "../lib/periods";

type PeriodKey = "week" | "month" | "make";

// Auto-computed ("lowest gigs wins") New Cadet of the Week/Month/Make —
// mirrors AutoStandingsSection's Team/Squad/Platoon version, including tie
// handling: every cadet tied for fewest weighted lineup gigs is shown, and
// the ranked table uses standard competition ranking (1, 1, 3, ...) so ties
// share a rank instead of being arbitrarily broken by sort order.
export default function NewCadetAutoStandingsSection({
  cadets,
  lineupEntries,
  makePeriods,
}: {
  cadets: NewCadetStanding[];
  lineupEntries: MetricEntry[];
  makePeriods: MakePeriod[];
}) {
  const [tab, setTab] = useState<PeriodKey>("week");

  const week = currentIsoWeekRange();
  const month = currentMonthRange();
  const make = findCurrentMake(makePeriods);

  const weekStandings = computeNewCadetStandings(lineupEntries, cadets, week.start, week.end);
  const monthStandings = computeNewCadetStandings(lineupEntries, cadets, month.start, month.end);
  const makeStandings = make ? computeNewCadetStandings(lineupEntries, cadets, make.start, make.end) : [];

  if (cadets.length === 0) return null;

  const tabs: { key: PeriodKey; title: string; sub: string; standings: RankedNewCadet[]; unavailable?: string }[] = [
    { key: "week", title: "New Cadet of the Week", sub: week.label, standings: weekStandings },
    { key: "month", title: "New Cadet of the Month", sub: month.label, standings: monthStandings },
    {
      key: "make",
      title: "New Cadet of the Make",
      sub: make?.label ?? "Not configured",
      standings: makeStandings,
      unavailable: make ? undefined : "Make periods aren't configured yet — set them on the Unit Performance tab.",
    },
  ];
  const active = tabs.find((t) => t.key === tab)!;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Auto-Computed Standings</h2>
        <p className="text-xs text-slate-400">Live · lowest weighted gigs wins</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg border p-3 text-left ${
              tab === t.key ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t.sub}</p>
            {t.unavailable ? (
              <p className="mt-1 text-sm text-slate-400">Not available</p>
            ) : t.standings.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No cadets yet</p>
            ) : (
              (() => {
                const best = t.standings[0].weightedGigs;
                const leaders = t.standings.filter((s) => s.weightedGigs === best);
                return (
                  <p className="mt-1 text-sm font-bold text-amber-900">
                    {leaders.map((l) => l.name).join(", ")} · {best} {best === 1 ? "gig" : "gigs"}
                    {leaders.length > 1 ? " (tied)" : ""}
                  </p>
                );
              })()
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {active.unavailable ? (
          <p className="px-4 py-4 text-sm text-slate-400">{active.unavailable}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Rank</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Weighted Gigs</th>
                </tr>
              </thead>
              <tbody>
                {active.standings.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-sm text-slate-400">
                      No New Cadets to rank yet.
                    </td>
                  </tr>
                )}
                {active.standings.map((s) => {
                  // Standard competition ranking (1, 1, 3, ...) so ties share a
                  // rank instead of being arbitrarily broken by sort order.
                  const rank = active.standings.filter((o) => o.weightedGigs < s.weightedGigs).length + 1;
                  return (
                    <tr key={s.cadetId} className={`border-b border-slate-100 ${rank === 1 ? "bg-amber-50/60" : ""}`}>
                      <td className="px-4 py-2 text-slate-500">
                        {rank}
                        {rank === 1 && <span className="ml-1.5 text-amber-500">★</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-800">{s.name}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800">{s.weightedGigs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
