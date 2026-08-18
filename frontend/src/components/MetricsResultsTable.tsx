import type { MetricEntry } from "../types";
import { formatPosition, metricEntryDescription } from "../types";

function typeLabel(entry: MetricEntry): string {
  const flags = [entry.is_dc ? "DC" : null, entry.is_work_detail ? "Work Detail" : null].filter(Boolean).join(", ");
  return `${metricEntryDescription(entry)}${flags ? ` (${flags})` : ""}`;
}

export default function MetricsResultsTable({
  entries,
  onRemove,
}: {
  entries: MetricEntry[];
  onRemove: (entry: MetricEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="px-1 py-3 text-sm text-slate-400">No entries match.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Cadet</th>
            <th className="py-2 pr-3">Position</th>
            <th className="py-2 pr-3">Note</th>
            <th className="py-2 pr-3" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-slate-100">
              <td className="py-2 pr-3 text-slate-800">{entry.entry_date}</td>
              <td className="py-2 pr-3 text-slate-600">{typeLabel(entry)}</td>
              <td className="py-2 pr-3 text-slate-800">{entry.cadet_name}</td>
              <td className="py-2 pr-3 text-slate-500">{entry.cadet_position ? formatPosition(entry.cadet_position) : "-"}</td>
              <td className="py-2 pr-3 text-slate-500">{entry.note ?? "-"}</td>
              <td className="py-2 pr-3 text-right">
                <button onClick={() => onRemove(entry)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
