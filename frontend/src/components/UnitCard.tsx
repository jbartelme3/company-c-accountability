import { useState } from "react";
import type { UnitSummary, UnitType } from "../types";
import { METRIC_LABELS, METRIC_TYPE_ORDER, UNIT_TYPE_LABELS, formatRank } from "../types";
import MetricBadge from "./MetricBadge";

export default function UnitCard({ unitType, unit }: { unitType: UnitType; unit: UnitSummary }) {
  const [expanded, setExpanded] = useState(false);
  const { leader, members, metric_totals, negative_total } = unit;
  const loggedTypes = METRIC_TYPE_ORDER.filter((t) => metric_totals[t] > 0);
  const label = UNIT_TYPE_LABELS[unitType];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div>
          <p className="font-semibold text-slate-900">
            {leader.first_name} {leader.last_name}'s {label}
          </p>
          <p className="text-xs text-slate-500">
            {formatRank(leader.rank)} · {members.length} {members.length === 1 ? "member" : "members"}
            {!!negative_total && ` · ${negative_total} flagged ${negative_total === 1 ? "entry" : "entries"}`}
          </p>
        </div>
        <span className="text-slate-400">{expanded ? "▲" : "▼"}</span>
      </button>

      <div className="border-t border-slate-100 px-4 py-3">
        {loggedTypes.length === 0 ? (
          <p className="text-xs text-slate-400">No metrics logged for this {unitType} yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {loggedTypes.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
              >
                {METRIC_LABELS[t]}
                <MetricBadge type={t} count={metric_totals[t]} />
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {members
            .slice()
            .sort((a, b) => a.last_name.localeCompare(b.last_name))
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm first:border-t-0"
              >
                <span className={m.id === leader.id ? "font-medium text-slate-900" : "text-slate-700"}>
                  {m.last_name}, {m.first_name}
                  {m.id === leader.id ? " (Leader)" : ""}
                </span>
                <span className="text-xs text-slate-500">
                  {m.position}
                  {!!m.negative_count && ` · ${m.negative_count} flagged`}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
