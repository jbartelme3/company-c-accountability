import { useState } from "react";
import type { Cadet, MetricEntry, OffenseType } from "../types";
import { OFFENSE_TYPES } from "../types";
import { CATEGORICAL_COLORS, CHART_INK } from "../lib/chartPalette";

// Same index-based color assignment the "By Type" trend chart uses (see
// OffensesSection), so Type I/II/III/IV mean the same color in both views.
const OFFENSE_TYPE_COLORS: Record<OffenseType, string> = Object.fromEntries(
  OFFENSE_TYPES.map((t, i) => [t, CATEGORICAL_COLORS[i]]),
) as Record<OffenseType, string>;

interface CadetOffenseTotals {
  cadetId: number;
  name: string;
  byType: Record<OffenseType, number>;
  total: number;
}

function computeTotals(entries: MetricEntry[], cadets: Cadet[]): CadetOffenseTotals[] {
  const cadetById = new Map(cadets.map((c) => [c.id, c]));
  const byCadet = new Map<number, Record<OffenseType, number>>();

  for (const e of entries) {
    if (!e.offense_type) continue;
    const rec = byCadet.get(e.cadet_id) ?? { "Type I": 0, "Type II": 0, "Type III": 0, "Type IV": 0 };
    rec[e.offense_type] += 1;
    byCadet.set(e.cadet_id, rec);
  }

  const results: CadetOffenseTotals[] = [];
  for (const [cadetId, byType] of byCadet) {
    const c = cadetById.get(cadetId);
    const total = OFFENSE_TYPES.reduce((sum, t) => sum + byType[t], 0);
    results.push({ cadetId, name: c ? `${c.last_name}, ${c.first_name}` : `Cadet #${cadetId}`, byType, total });
  }
  // Most offenses first — this view exists to surface who needs attention.
  return results.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

const WIDTH = 640;
const ROW_HEIGHT = 26;
const PAD = { top: 8, right: 40, bottom: 8, left: 140 };

// Ranked stacked-bar breakdown of who's actually getting the offenses shown
// in the "By Type" trend chart — one row per cadet with ≥1 offense, segments
// colored/ordered by Type I-IV so both volume and severity mix are visible
// at a glance. Companion "mode" to the weekly trend view (see OffensesSection).
export default function OffenseByCadetChart({ entries, cadets }: { entries: MetricEntry[]; cadets: Cadet[] }) {
  const [showTable, setShowTable] = useState(false);
  const totals = computeTotals(entries, cadets);

  if (totals.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">Offenses by Cadet</h3>
        <p className="py-6 text-center text-sm text-slate-400">No offenses logged yet.</p>
      </div>
    );
  }

  const maxTotal = Math.max(1, ...totals.map((t) => t.total));
  const innerW = WIDTH - PAD.left - PAD.right;
  const height = PAD.top + PAD.bottom + totals.length * ROW_HEIGHT;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Offenses by Cadet</h3>
        </div>
        <button onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-3">
        {OFFENSE_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: OFFENSE_TYPE_COLORS[t] }} />
            {t}
          </span>
        ))}
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1 pr-3">Cadet</th>
                {OFFENSE_TYPES.map((t) => (
                  <th key={t} className="py-1 pr-3">
                    {t}
                  </th>
                ))}
                <th className="py-1 pr-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((row) => (
                <tr key={row.cadetId} className="border-b border-slate-100">
                  <td className="py-1 pr-3 text-slate-700">{row.name}</td>
                  {OFFENSE_TYPES.map((t) => (
                    <td key={t} className="py-1 pr-3 text-slate-600">
                      {row.byType[t]}
                    </td>
                  ))}
                  <td className="py-1 pr-3 font-semibold text-slate-800">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label="Offenses by cadet">
          {totals.map((row, i) => {
            const y = PAD.top + i * ROW_HEIGHT;
            let x = PAD.left;
            const segments = OFFENSE_TYPES.filter((t) => row.byType[t] > 0);
            return (
              <g key={row.cadetId}>
                <text x={PAD.left - 8} y={y + ROW_HEIGHT / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={CHART_INK.secondary}>
                  {row.name}
                </text>
                {segments.map((t) => {
                  const w = (row.byType[t] / maxTotal) * innerW;
                  const rect = (
                    <rect key={t} x={x} y={y + 4} width={Math.max(2, w)} height={ROW_HEIGHT - 10} fill={OFFENSE_TYPE_COLORS[t]} />
                  );
                  x += w;
                  return rect;
                })}
                <text x={x + 6} y={y + ROW_HEIGHT / 2} dominantBaseline="middle" fontSize={11} fill={CHART_INK.primary}>
                  {row.total}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
