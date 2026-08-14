import { useState } from "react";
import type { MakePeriod, MetricEntry, UnitSummary, UnitType } from "../types";
import { UNIT_TYPE_LABELS } from "../types";
import { computeUnitStandings, type RankedUnit } from "../lib/gigScore";
import { currentIsoWeekRange, currentMonthRange, findCurrentMake } from "../lib/periods";

type PeriodKey = "week" | "month" | "make";

// Auto-computed ("lowest gigs wins") Team/Squad/Platoon of the Week/Month/Make
// — derived live from currently-logged gig entries, alongside (not replacing)
// the manual UnitOfWeekSection recording flow below it.
export default function AutoStandingsSection({
  unitType,
  units,
  entries,
  makePeriods,
}: {
  unitType: UnitType;
  units: UnitSummary[];
  entries: MetricEntry[];
  makePeriods: MakePeriod[];
}) {
  const [tab, setTab] = useState<PeriodKey>("week");
  const label = UNIT_TYPE_LABELS[unitType];

  const week = currentIsoWeekRange();
  const month = currentMonthRange();
  const make = findCurrentMake(makePeriods);

  const weekStandings = computeUnitStandings(units, entries, week.start, week.end);
  const monthStandings = computeUnitStandings(units, entries, month.start, month.end);
  const makeStandings = make ? computeUnitStandings(units, entries, make.start, make.end) : [];

  if (units.length === 0) return null;

  const tabs: { key: PeriodKey; title: string; sub: string; standings: RankedUnit[]; unavailable?: string }[] = [
    { key: "week", title: `${label} of the Week`, sub: week.label, standings: weekStandings },
    { key: "month", title: `${label} of the Month`, sub: month.label, standings: monthStandings },
    {
      key: "make",
      title: `${label} of the Make`,
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
              tab === t.key ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t.sub}</p>
            {t.unavailable ? (
              <p className="mt-1 text-sm text-slate-400">Not available</p>
            ) : t.standings.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No units yet</p>
            ) : (
              <p className="mt-1 text-sm font-bold text-emerald-900">
                {t.standings[0].leaderName}'s {label} · {t.standings[0].weightedGigs} gigs
              </p>
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
                  <th className="px-4 py-2">{label}</th>
                  <th className="px-4 py-2">Members</th>
                  <th className="px-4 py-2">Weighted Gigs</th>
                </tr>
              </thead>
              <tbody>
                {active.standings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-slate-400">
                      No {label.toLowerCase()}s to rank yet.
                    </td>
                  </tr>
                )}
                {active.standings.map((s, i) => (
                  <tr key={s.leaderId} className={`border-b border-slate-100 ${i === 0 ? "bg-emerald-50/60" : ""}`}>
                    <td className="px-4 py-2 text-slate-500">
                      {i + 1}
                      {i === 0 && <span className="ml-1.5 text-emerald-600">★</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-800">
                      {s.leaderName}'s {label}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{s.memberCount}</td>
                    <td className="px-4 py-2 font-semibold text-slate-800">{s.weightedGigs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
