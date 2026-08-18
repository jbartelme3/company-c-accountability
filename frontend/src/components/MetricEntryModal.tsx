import { useState } from "react";
import { metricsApi, ApiError } from "../api/client";
import type { MetricEntry, MetricType } from "../types";
import { METRIC_LABELS, METRIC_TYPE_ORDER, isEligibleForNewCadetLineupGig, metricEntrySubDetail } from "../types";
import { useMetricEntryFields } from "../hooks/useMetricEntryFields";

const QUANTITIES = Array.from({ length: 20 }, (_, i) => i + 1);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const INELIGIBLE_LINEUP_GIG_REASON = "New Cadet Lineup Gigs only apply to cadets currently holding the New Cadet rank.";

export default function MetricEntryModal({
  cadetId,
  cadetName,
  cadet,
  type,
  entries,
  onClose,
  onChanged,
}: {
  cadetId: number;
  cadetName: string;
  /** Only needed to gate New Cadet Lineup Gig eligibility. */
  cadet: { position: string; rank: string | null };
  /** A fixed metric type, or null to let the user pick one from a dropdown (e.g. the Cadets tab's quick-add). */
  type: MetricType | null;
  /** Every metric entry for this cadet — filtered internally to whichever type is active. */
  entries: MetricEntry[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [selectedType, setSelectedType] = useState<MetricType | "">(type ?? "");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const typeLocked = type !== null;
  const activeType = typeLocked ? type : selectedType || null;
  const eligible = activeType == null || activeType !== "new_cadet_lineup_gig" || isEligibleForNewCadetLineupGig(cadet);
  const typeEntries = activeType ? entries.filter((e) => e.type === activeType) : [];
  const typeFields = useMetricEntryFields(activeType);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!activeType) {
      setError("Select a metric type.");
      return;
    }
    if (!typeFields.valid) {
      setError("Fill in the required fields for this metric type.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await metricsApi.create({
        cadet_id: cadetId,
        type: activeType,
        ...typeFields.payload,
        quantity: Number(quantity) || 1,
        entry_date: date,
        note: note.trim() || null,
      });
      setNote("");
      setQuantity("1");
      typeFields.reset();
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
            {activeType ? METRIC_LABELS[activeType] : "Add Metric"} · {cadetName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {eligible ? (
          <form onSubmit={addEntry} className="mt-4 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            {!typeLocked && (
              <div>
                <label className="block text-xs font-medium text-slate-600">Metric type</label>
                <select
                  required
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as MetricType)}
                  className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                >
                  <option value="">Select…</option>
                  {METRIC_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {METRIC_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
            {typeFields.fields}
            {activeType && (
              <div>
                <label className="block text-xs font-medium text-slate-600">How many</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                >
                  {QUANTITIES.map((q) => (
                    <option key={q} value={q}>
                      {q}
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
              disabled={submitting || !activeType || !typeFields.valid}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            {INELIGIBLE_LINEUP_GIG_REASON}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
          {activeType == null && <p className="text-sm text-slate-400">Pick a metric type to see its entries.</p>}
          {activeType != null && typeEntries.length === 0 && <p className="text-sm text-slate-400">No entries yet.</p>}
          {typeEntries.map((entry) => {
            const sub = metricEntrySubDetail(entry);
            return (
              <div key={entry.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{entry.entry_date}</span>
                  {sub && (
                    <span className="ml-2 text-xs font-semibold text-slate-500">
                      {sub}
                      {entry.is_dc ? " · DC" : ""}
                      {entry.is_work_detail ? " · Work Detail" : ""}
                    </span>
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
            );
          })}
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
