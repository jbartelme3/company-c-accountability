import { useState } from "react";
import type { Cadet, MetricEntry } from "../types";
import { LAUNDRY_TYPE_LABELS, LINEUP_GIG_TYPE_LABELS, METRIC_LABELS } from "../types";
import { CHART_INK } from "../lib/chartPalette";

export interface ByCadetSubType {
  key: string;
  label: string;
  color: string;
}

interface CadetTotals {
  cadetId: number;
  name: string;
  bySubType: Record<string, number>;
  total: number;
  entries: MetricEntry[];
}

// Default per-entry description for the expandable "what did they do"
// list — the metric label, plus whatever sub-type detail the entry itself
// carries (laundry type, lineup gig type, offense type/detail). Notes are
// appended by the caller, in parentheses.
function defaultDetailFor(e: MetricEntry): string {
  if (e.type === "offense" && e.offense_type && e.offense_detail) return `${e.offense_type} — ${e.offense_detail}`;
  if (e.type === "laundry_gig" && e.laundry_type) return `${METRIC_LABELS[e.type]} — ${LAUNDRY_TYPE_LABELS[e.laundry_type]}`;
  if (e.type === "new_cadet_lineup_gig" && e.lineup_gig_type) {
    return `${METRIC_LABELS[e.type]} — ${LINEUP_GIG_TYPE_LABELS[e.lineup_gig_type]}`;
  }
  return METRIC_LABELS[e.type];
}

function computeTotals(
  entries: MetricEntry[],
  cadets: Cadet[],
  subTypeOf: (e: MetricEntry) => string,
  weightOf: (e: MetricEntry) => number,
): CadetTotals[] {
  const cadetById = new Map(cadets.map((c) => [c.id, c]));
  const byCadet = new Map<number, { bySubType: Record<string, number>; total: number; entries: MetricEntry[] }>();

  for (const e of entries) {
    const rec = byCadet.get(e.cadet_id) ?? { bySubType: {}, total: 0, entries: [] };
    const key = subTypeOf(e);
    const weight = weightOf(e);
    rec.bySubType[key] = (rec.bySubType[key] ?? 0) + weight;
    rec.total += weight;
    rec.entries.push(e);
    byCadet.set(e.cadet_id, rec);
  }

  const results: CadetTotals[] = [];
  for (const [cadetId, rec] of byCadet) {
    const c = cadetById.get(cadetId);
    results.push({
      cadetId,
      name: c ? `${c.last_name}, ${c.first_name}` : `Cadet #${cadetId}`,
      bySubType: rec.bySubType,
      total: rec.total,
      entries: [...rec.entries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : a.entry_date > b.entry_date ? -1 : 0)),
    });
  }
  // Most entries first — this view exists to surface who needs attention.
  return results.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

const WIDTH = 640;
const ROW_HEIGHT = 26;
const PAD = { top: 8, right: 40, bottom: 8, left: 140 };

// Ranked stacked-bar breakdown of who's actually racking up entries for a
// metric (or a facet of related metrics) — one row per cadet with ≥1 entry,
// segments colored/ordered by subTypes so both volume and mix are visible
// at a glance. Every cadet row expands into a plain-language list of what
// they actually did, with any note in parentheses — the "By Cadet" half of
// every chart's By Type/By Cadet toggle (see ByTypeByCadetToggle).
export default function MetricsByCadetChart({
  title,
  entries,
  cadets,
  subTypes,
  subTypeOf,
  weightOf = () => 1,
  detailFor = defaultDetailFor,
  emptyMessage = "No entries logged yet.",
}: {
  title: string;
  entries: MetricEntry[];
  cadets: Cadet[];
  subTypes: ByCadetSubType[];
  subTypeOf: (e: MetricEntry) => string;
  weightOf?: (e: MetricEntry) => number;
  detailFor?: (e: MetricEntry) => string;
  emptyMessage?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const [expandedCadetId, setExpandedCadetId] = useState<number | null>(null);
  const totals = computeTotals(entries, cadets, subTypeOf, weightOf);

  if (totals.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="py-6 text-center text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const colorFor = (key: string) => subTypes.find((s) => s.key === key)?.color ?? CHART_INK.secondary;
  const maxTotal = Math.max(1, ...totals.map((t) => t.total));
  const innerW = WIDTH - PAD.left - PAD.right;
  const height = PAD.top + PAD.bottom + totals.length * ROW_HEIGHT;

  function toggleExpand(cadetId: number) {
    setExpandedCadetId((cur) => (cur === cadetId ? null : cadetId));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-400">Most entries first. Click a cadet below to see what they did.</p>
        </div>
        <button onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {subTypes.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {subTypes.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1 pr-3">Cadet</th>
                {subTypes.map((s) => (
                  <th key={s.key} className="py-1 pr-3">
                    {s.label}
                  </th>
                ))}
                <th className="py-1 pr-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((row) => (
                <tr key={row.cadetId} className="border-b border-slate-100">
                  <td className="py-1 pr-3 text-slate-700">{row.name}</td>
                  {subTypes.map((s) => (
                    <td key={s.key} className="py-1 pr-3 text-slate-600">
                      {row.bySubType[s.key] ?? 0}
                    </td>
                  ))}
                  <td className="py-1 pr-3 font-semibold text-slate-800">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label={title}>
          {totals.map((row, i) => {
            const y = PAD.top + i * ROW_HEIGHT;
            let x = PAD.left;
            const segments = Object.keys(row.bySubType).filter((k) => row.bySubType[k] > 0);
            return (
              <g key={row.cadetId}>
                <text x={PAD.left - 8} y={y + ROW_HEIGHT / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={CHART_INK.secondary}>
                  {row.name}
                </text>
                {segments.map((k) => {
                  const w = (row.bySubType[k] / maxTotal) * innerW;
                  const rect = (
                    <rect key={k} x={x} y={y + 4} width={Math.max(2, w)} height={ROW_HEIGHT - 10} fill={colorFor(k)} />
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

      {/* Per-cadet dropdown — expands into exactly what that cadet did, with any note in parentheses. */}
      <div className="mt-3 space-y-1">
        {totals.map((row) => {
          const isOpen = expandedCadetId === row.cadetId;
          return (
            <div key={row.cadetId} className="overflow-hidden rounded-md border border-slate-200">
              <button
                onClick={() => toggleExpand(row.cadetId)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <span>
                  {row.name} <span className="text-slate-400">({row.total})</span>
                </span>
                <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <ul className="space-y-1 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {row.entries.map((e) => (
                    <li key={e.id}>
                      <span className="text-slate-500">{e.entry_date}</span> — {detailFor(e)}
                      {e.note && <span className="text-slate-500"> ({e.note})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
