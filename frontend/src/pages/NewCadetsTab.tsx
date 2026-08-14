import { useEffect, useState } from "react";
import { cadetsApi, makePeriodsApi, metricsApi, newCadetsApi } from "../api/client";
import type { CadetProfile as CadetProfileType, MakePeriod, MetricEntry, NewCadetStanding } from "../types";
import { formatClassYear } from "../types";
import CadetProfile from "./CadetProfile";
import MetricEntryModal from "../components/MetricEntryModal";
import ConductGigReportsSection from "../components/ConductGigReportsSection";
import NewCadetStandingsChart from "../components/NewCadetStandingsChart";
import NewCadetAutoStandingsSection from "../components/NewCadetAutoStandingsSection";

export default function NewCadetsTab() {
  const [standings, setStandings] = useState<NewCadetStanding[]>([]);
  const [lineupEntries, setLineupEntries] = useState<MetricEntry[]>([]);
  const [makePeriods, setMakePeriods] = useState<MakePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCadetId, setSelectedCadetId] = useState<number | null>(null);
  const [addingCadet, setAddingCadet] = useState<CadetProfileType | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [standingsData, lineupData, periods] = await Promise.all([
        newCadetsApi.list(),
        metricsApi.list({ type: "new_cadet_lineup_gig" }),
        makePeriodsApi.list(),
      ]);
      setStandings(standingsData);
      setLineupEntries(lineupData);
      setMakePeriods(periods);
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">New Cadets</h2>

        {!loading && standings.length > 0 && (
          <div className="mb-6">
            <NewCadetAutoStandingsSection cadets={standings} lineupEntries={lineupEntries} makePeriods={makePeriods} />
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
          cadet={addingCadet}
          type="new_cadet_lineup_gig"
          entries={addingCadet.metric_entries}
          onClose={() => setAddingCadet(null)}
          onChanged={refreshAddingCadet}
        />
      )}
    </div>
  );
}
