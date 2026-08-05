import { useState } from "react";
import { metricsApi, ApiError } from "../api/client";
import type { LaundryType, MetricEntry, MetricType } from "../types";
import { LAUNDRY_TYPES, LAUNDRY_TYPE_LABELS, METRIC_LABELS } from "../types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MetricEntryModal({
  cadetId,
  cadetName,
  type,
  entries,
  canAdd = true,
  ineligibleReason,
  onClose,
  onChanged,
}: {
  cadetId: number;
  cadetName: string;
  type: MetricType;
  entries: MetricEntry[];
  canAdd?: boolean;
  ineligibleReason?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [laundryType, setLaundryType] = useState<LaundryType>("mixed_laundry");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await metricsApi.create({
        cadet_id: cadetId,
        type,
        laundry_type: type === "laundry_gig" ? laundryType : undefined,
        entry_date: date,
        note: note.trim() || null,
      });
      setNote("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeEntry(id: number) {
    if (!confirm("Remove this entry? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      await metricsApi.remove(id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove entry.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            {METRIC_LABELS[type]} — {cadetName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {canAdd ? (
          <form onSubmit={addEntry} className="mt-4 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
            {type === "laundry_gig" && (
              <div>
                <label className="block text-xs font-medium text-slate-600">Laundry type</label>
                <select
                  value={laundryType}
                  onChange={(e) => setLaundryType(e.target.value as LaundryType)}
                  className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                >
                  {LAUNDRY_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {LAUNDRY_TYPE_LABELS[lt]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            {ineligibleReason ?? "Not eligible for this metric."}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
          {entries.length === 0 && <p className="text-sm text-slate-400">No entries yet.</p>}
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-slate-800">{entry.entry_date}</span>
                {entry.laundry_type && (
                  <span className="ml-2 text-xs font-semibold text-slate-500">{LAUNDRY_TYPE_LABELS[entry.laundry_type]}</span>
                )}
                {entry.note && <span className="ml-2 text-slate-500">{entry.note}</span>}
              </div>
              <button
                onClick={() => removeEntry(entry.id)}
                disabled={busyId === entry.id}
                className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
