import { useState } from "react";
import type { NewCadetStanding } from "../types";
import { CATEGORICAL_COLORS, CHART_INK } from "../lib/chartPalette";

const WIDTH = 640;
const ROW_HEIGHT = 26;
const PAD = { top: 8, right: 48, bottom: 8, left: 140 };

// Ranked horizontal-bar leaderboard of every current New Cadet by all-time
// weighted lineup-gig count (fewest first — same "lowest wins" convention as
// the Military Banner). `cadets` is expected pre-sorted ascending by
// lineup_gig_count, same order the roster table below uses.
export default function NewCadetStandingsChart({ cadets }: { cadets: NewCadetStanding[] }) {
  const [showTable, setShowTable] = useState(false);

  if (cadets.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">New Cadet Lineup Gig Standings</h3>
        <p className="py-6 text-center text-sm text-slate-400">No cadets currently hold the New Cadet rank.</p>
      </div>
    );
  }

  const maxCount = Math.max(1, ...cadets.map((c) => c.lineup_gig_count));
  const innerW = WIDTH - PAD.left - PAD.right;
  const height = PAD.top + PAD.bottom + cadets.length * ROW_HEIGHT;

  function barWidth(count: number): number {
    return (count / maxCount) * innerW;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">New Cadet Lineup Gig Standings</h3>
        <button onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1 pr-3">Rank</th>
                <th className="py-1 pr-3">Name</th>
                <th className="py-1 pr-3">Lineup Gigs</th>
              </tr>
            </thead>
            <tbody>
              {cadets.map((c, i) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-1 pr-3 text-slate-700">{i + 1}</td>
                  <td className="py-1 pr-3 text-slate-700">
                    {c.last_name}, {c.first_name}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{c.lineup_gig_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label="New Cadet lineup gig standings">
          {cadets.map((c, i) => {
            const y = PAD.top + i * ROW_HEIGHT;
            const w = barWidth(c.lineup_gig_count);
            const color = i === 0 ? "#c98a04" : CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length];
            return (
              <g key={c.id}>
                <text x={PAD.left - 8} y={y + ROW_HEIGHT / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={CHART_INK.secondary}>
                  {i === 0 ? "★ " : ""}
                  {c.last_name}, {c.first_name}
                </text>
                <rect x={PAD.left} y={y + 4} width={Math.max(2, w)} height={ROW_HEIGHT - 10} fill={color} rx={2} />
                <text x={PAD.left + w + 6} y={y + ROW_HEIGHT / 2} dominantBaseline="middle" fontSize={11} fill={CHART_INK.primary}>
                  {c.lineup_gig_count}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
