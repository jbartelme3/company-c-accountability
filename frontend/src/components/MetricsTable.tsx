import { useEffect, useState } from "react";
import { cadetsApi, metricsApi, ApiError } from "../api/client";
import type { Cadet, MetricEntry, MetricExtraColumn, MetricType } from "../types";
import { METRIC_EXTRA_COLUMNS, METRIC_EXTRA_COLUMN_LABELS, isEligibleForNewCadetLineupGig, metricExtraColumnText } from "../types";
import { useMetricEntryFields } from "../hooks/useMetricEntryFields";

const QUANTITIES = Array.from({ length: 20 }, (_, i) => i + 1);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MetricsTable({
  type,
  entries,
  onChanged,
}: {
  type: MetricType;
  entries: MetricEntry[];
  onChanged: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const extraColumns = METRIC_EXTRA_COLUMNS[type] ?? [];
  const columnCount = 4 + extraColumns.length;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Cadet</th>
              {extraColumns.map((col) => (
                <th key={col} className="py-2 pr-3">
                  {METRIC_EXTRA_COLUMN_LABELS[col]}
                </th>
              ))}
              <th className="py-2 pr-3">Note</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="py-4 text-sm text-slate-400">
                  No entries yet.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <Row key={entry.id} extraColumns={extraColumns} entry={entry} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => setShowAdd((v) => !v)} className="mt-3 text-sm font-semibold text-slate-700 hover:text-slate-900">
        {showAdd ? "Cancel" : "+ Add entry"}
      </button>

      {showAdd && (
        <AddEntryForm
          type={type}
          onCreated={() => {
            setShowAdd(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function Row({
  extraColumns,
  entry,
  onChanged,
}: {
  extraColumns: MetricExtraColumn[];
  entry: MetricEntry;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Remove this entry for ${entry.cadet_name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await metricsApi.remove(entry.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove.");
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-3 text-slate-800">{entry.entry_date}</td>
      <td className="py-2 pr-3 text-slate-800">
        {entry.cadet_name}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </td>
      {extraColumns.map((col) => (
        <td key={col} className="py-2 pr-3 text-slate-600">
          {metricExtraColumnText(entry, col)}
        </td>
      ))}
      <td className="py-2 pr-3 text-slate-500">{entry.note ?? "-"}</td>
      <td className="py-2 pr-3 text-right">
        <button onClick={remove} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-red-600">
          Remove
        </button>
      </td>
    </tr>
  );
}

function AddEntryForm({ type, onCreated }: { type: MetricType; onCreated: () => void }) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [cadetId, setCadetId] = useState<number | "">("");
  const [date, setDate] = useState(todayIso());
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const typeFields = useMetricEntryFields(type);

  useEffect(() => {
    cadetsApi.list().then(setCadets);
  }, []);

  const selectableCadets = type === "new_cadet_lineup_gig" ? cadets.filter(isEligibleForNewCadetLineupGig) : cadets;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cadetId) {
      setError("Select a cadet.");
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
        type,
        ...typeFields.payload,
        quantity: Number(quantity) || 1,
        entry_date: date,
        note: note.trim() || null,
      });
      typeFields.reset();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Cadet</label>
        <select
          required
          value={cadetId}
          onChange={(e) => setCadetId(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        >
          <option value="">Select…</option>
          {selectableCadets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.last_name}, {c.first_name}
            </option>
          ))}
        </select>
        {type === "new_cadet_lineup_gig" && selectableCadets.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">No cadets currently at the New Cadet rank.</p>
        )}
      </div>
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
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm" />
      </div>
      <button
        type="submit"
        disabled={submitting || !typeFields.valid}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
