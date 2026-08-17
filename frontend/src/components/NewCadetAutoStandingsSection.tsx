import type { MakePeriod, MetricEntry, NewCadetStanding } from "../types";
import { computeNewCadetStandings } from "../lib/gigScore";
import { currentIsoWeekRange, currentMonthRange, findCurrentMake } from "../lib/periods";

type PeriodKey = "week" | "month" | "make";

// Auto-computed ("lowest gigs wins") New Cadet of the Week/Month/Make —
// mirrors AutoStandingsSection's Team/Squad/Platoon version, including tie
// handling: every cadet tied for fewest weighted lineup gigs is called out
// in its card. Deliberately just the three champion cards, not a full
// ranked table — the roster table below (NewCadetsTab) is the one place
// that lists every New Cadet, so this stays a summary, not a second list.
export default function NewCadetAutoStandingsSection({
  cadets,
  lineupEntries,
  makePeriods,
}: {
  cadets: NewCadetStanding[];
  lineupEntries: MetricEntry[];
  makePeriods: MakePeriod[];
}) {
  const week = currentIsoWeekRange();
  const month = currentMonthRange();
  const make = findCurrentMake(makePeriods);

  const weekStandings = computeNewCadetStandings(lineupEntries, cadets, week.start, week.end);
  const monthStandings = computeNewCadetStandings(lineupEntries, cadets, month.start, month.end);
  const makeStandings = make ? computeNewCadetStandings(lineupEntries, cadets, make.start, make.end) : [];

  if (cadets.length === 0) return null;

  const cards: { key: PeriodKey; title: string; sub: string; standings: ReturnType<typeof computeNewCadetStandings>; unavailable?: string }[] = [
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Auto-Computed Standings</h2>
        <p className="text-xs text-slate-400">Live · lowest weighted gigs wins</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{c.sub}</p>
            {c.unavailable ? (
              <p className="mt-1 text-sm text-slate-400">Not available</p>
            ) : c.standings.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No cadets yet</p>
            ) : (
              (() => {
                const best = c.standings[0].weightedGigs;
                const leaders = c.standings.filter((s) => s.weightedGigs === best);
                return (
                  <p className="mt-1 text-sm font-bold text-amber-900">
                    {leaders.map((l) => l.name).join(", ")} · {best} {best === 1 ? "gig" : "gigs"}
                    {leaders.length > 1 ? " (tied)" : ""}
                  </p>
                );
              })()
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
