import { useEffect, useState } from "react";
import { newCadetsApi } from "../api/client";
import type { NewCadetStanding } from "../types";
import { formatClassYear } from "../types";
import CadetProfile from "./CadetProfile";

export default function NewCadetsTab() {
  const [standings, setStandings] = useState<NewCadetStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCadetId, setSelectedCadetId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setStandings(await newCadetsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
    <div>
      <h2 className="mb-4 text-lg font-bold text-slate-900">New Cadets</h2>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Class Year</th>
                <th className="px-4 py-2">Lineup Gigs</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && standings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm text-slate-400">
                    No cadets currently hold the New Cadet rank.
                  </td>
                </tr>
              )}
              {!loading &&
                standings.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedCadetId(s.id)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2 text-slate-800">
                      {s.last_name}, {s.first_name}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{formatClassYear(s.class_year)}</td>
                    <td className="px-4 py-2 text-slate-600">{s.lineup_gig_count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
