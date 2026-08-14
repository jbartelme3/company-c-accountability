import { useEffect, useState } from "react";
import { cadetsApi, metricsApi, newCadetsApi } from "../api/client";
import type { CadetProfile as CadetProfileType, MetricEntry, NewCadetStanding } from "../types";
import { formatClassYear, isEligibleForNewCadetLineupGig } from "../types";
import CadetProfile from "./CadetProfile";
import MetricEntryModal from "../components/MetricEntryModal";
import ConductGigReportsSection from "../components/ConductGigReportsSection";
import NewCadetStandingsChart from "../components/NewCadetStandingsChart";
import { computeNewCadetStandings } from "../lib/gigScore";
import { currentIsoWeekRange } from "../lib/periods";

export default function NewCadetsTab() {
  const [standings, setStandings] = useState<NewCadetStanding[]>([]);
  const [lineupEntries, setLineupEntries] = useState<MetricEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCadetId, setSelectedCadetId] = useState<number | null>(null);
  const [addingCadet, setAddingCadet] = useState<CadetProfileType | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [standingsData, lineupData] = await Promise.all([
        newCadetsApi.list(),
        metricsApi.list({ type: "new_cadet_lineup_gig" }),
      ]);
      setStandings(standingsData);
      setLineupEntries(lineupData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openAdd(cadetId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setAddingCadet(await cadetsApi.get(cadetId));
  }

  async function refreshAddingCadet() {
    if (!addingCadet) return;
    setAddingCadet(await cadetsApi.get(addingCadet.id));
    load();
  }

  if (selectedCadetId !== null) {
    return (
      <CadetProfile
        cadetId={selectedCadetId}
        onBack={() => {
          setSelectedCadetId(null);
          load();
        }}
      />
    );
  }

  const week = currentIsoWeekRange();
  const weekStandings = computeNewCadetStandings(lineupEntries, standings, week.start, week.end);
  const weekBest = weekStandings.length > 0 ? Math.min(...weekStandings.map((s) => s.weightedGigs)) : 0;
  const weekLeaders = weekStandings.filter((s) => s.weightedGigs === weekBest);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">New Cadets</h2>

        {!loading && standings.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">New Cadet of the Week</p>
            <p className="mt-1 text-xs text-amber-700">{week.label}</p>
            {weekLeaders.length === 0 ? (
              <p className="mt-1 text-sm text-amber-900">No lineup gigs logged this week yet.</p>
            ) : (
              <p className="mt-1 text-lg font-bold text-amber-900">
                {weekLeaders.map((l) => l.name).join(", ")} · {weekBest} {weekBest === 1 ? "gig" : "gigs"} this week
                {weekLeaders.length > 1 ? " (tied)" : ""}
              </p>
            )}
          </div>
        )}

        {!loading && <NewCadetStandingsChart cadets={standings} />}

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Class Year</th>
                  <th className="px-4 py-2">Lineup Gigs</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && standings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm text-slate-400">
                      No cadets currently hold the New Cadet rank.
                    </td>
                  </tr>
                )}
                {!loading &&
                  standings.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedCadetId(s.id)}
                      className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${i === 0 ? "bg-amber-50/70" : ""}`}
                    >
                      <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-2 text-slate-800">
                        {i === 0 && <span className="mr-1.5 text-amber-500">★</span>}
                        {s.last_name}, {s.first_name}
                        {i === 0 && (
                          <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                            Top New Cadet
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{formatClassYear(s.class_year)}</td>
                      <td className="px-4 py-2 text-slate-600">{s.lineup_gig_count}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={(e) => openAdd(s.id, e)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConductGigReportsSection />

      {addingCadet && (
        <MetricEntryModal
          cadetId={addingCadet.id}
          cadetName={`${addingCadet.first_name} ${addingCadet.last_name}`}
          type="new_cadet_lineup_gig"
          entries={addingCadet.metric_entries.filter((e) => e.type === "new_cadet_lineup_gig")}
          canAdd={isEligibleForNewCadetLineupGig(addingCadet)}
          ineligibleReason="New Cadet Lineup Gigs only apply to cadets currently holding the New Cadet rank."
          onClose={() => setAddingCadet(null)}
          onChanged={refreshAddingCadet}
        />
      )}
    </div>
  );
}
