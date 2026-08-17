import { useEffect, useState } from "react";
import { cadetsApi, metricsApi, ApiError } from "../api/client";
import type { Cadet, LaundryType, LineupGigType, MetricEntry, MetricType, OffenseType } from "../types";
import {
  LAUNDRY_TYPES,
  LAUNDRY_TYPE_LABELS,
  LINEUP_GIG_TYPES,
  LINEUP_GIG_TYPE_LABELS,
  OFFENSE_DETAILS,
  OFFENSE_DETAIL_OTHER,
  OFFENSE_TYPES,
  OFFENSE_TYPE_LABELS,
  isEligibleForNewCadetLineupGig,
} from "../types";

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
  const hasSubType = type === "laundry_gig" || type === "new_cadet_lineup_gig";
  const columnCount = 4 + (hasSubType ? 1 : 0) + (type === "offense" ? 3 : 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Cadet</th>
              {type === "laundry_gig" && <th className="py-2 pr-3">Laundry Type</th>}
              {type === "new_cadet_lineup_gig" && <th className="py-2 pr-3">Gig For</th>}
              {type === "offense" && (
                <>
                  <th className="py-2 pr-3">Offense</th>
                  <th className="py-2 pr-3">DC</th>
                  <th className="py-2 pr-3">Work Detail</th>
                </>
              )}
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
              <Row key={entry.id} type={type} entry={entry} onChanged={onChanged} />
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

function Row({ type, entry, onChanged }: { type: MetricType; entry: MetricEntry; onChanged: () => void }) {
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
      {type === "laundry_gig" && (
        <td className="py-2 pr-3 text-slate-600">{entry.laundry_type ? LAUNDRY_TYPE_LABELS[entry.laundry_type] : "-"}</td>
      )}
      {type === "new_cadet_lineup_gig" && (
        <td className="py-2 pr-3 text-slate-600">
          {entry.lineup_gig_type ? LINEUP_GIG_TYPE_LABELS[entry.lineup_gig_type] : "-"}
          {entry.lineup_gig_type === "conduct" ? " (3)" : ""}
        </td>
      )}
      {type === "offense" && (
        <>
          <td className="py-2 pr-3 text-slate-600">
            {entry.offense_type} — {entry.offense_detail}
          </td>
          <td className="py-2 pr-3 text-slate-600">{entry.is_dc ? "Yes" : "No"}</td>
          <td className="py-2 pr-3 text-slate-600">{entry.is_work_detail ? "Yes" : "No"}</td>
        </>
      )}
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
  const [laundryType, setLaundryType] = useState<LaundryType>("mixed_laundry");
  const [lineupGigType, setLineupGigType] = useState<LineupGigType>("room");
  const [offenseType, setOffenseType] = useState<OffenseType | "">("");
  const [offenseDetail, setOffenseDetail] = useState("");
  const [offenseDetailOther, setOffenseDetailOther] = useState("");
  const [isDc, setIsDc] = useState(false);
  const [isWorkDetail, setIsWorkDetail] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cadetsApi.list().then(setCadets);
  }, []);

  const selectableCadets = type === "new_cadet_lineup_gig" ? cadets.filter(isEligibleForNewCadetLineupGig) : cadets;
  const resolvedOffenseDetail = offenseDetail === OFFENSE_DETAIL_OTHER ? offenseDetailOther.trim() : offenseDetail;
  const offenseValid = type !== "offense" || (!!offenseType && !!resolvedOffenseDetail);

  function handleOffenseTypeChange(next: OffenseType | "") {
    setOffenseType(next);
    setOffenseDetail("");
    setOffenseDetailOther("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cadetId) {
      setError("Select a cadet.");
      return;
    }
    if (!offenseValid) {
      setError("Select an offense type and detail.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await metricsApi.create({
        cadet_id: cadetId,
        type,
        laundry_type: type === "laundry_gig" ? laundryType : undefined,
        lineup_gig_type: type === "new_cadet_lineup_gig" ? lineupGigType : undefined,
        offense_type: type === "offense" ? (offenseType || undefined) : undefined,
        offense_detail: type === "offense" ? resolvedOffenseDetail : undefined,
        is_dc: type === "offense" ? isDc : undefined,
        is_work_detail: type === "offense" ? isWorkDetail : undefined,
        quantity: Number(quantity) || 1,
        entry_date: date,
        note: note.trim() || null,
      });
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
      {type === "new_cadet_lineup_gig" && (
        <div>
          <label className="block text-xs font-medium text-slate-600">Gig for</label>
          <select
            value={lineupGigType}
            onChange={(e) => setLineupGigType(e.target.value as LineupGigType)}
            className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {LINEUP_GIG_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {LINEUP_GIG_TYPE_LABELS[lt]}
                {lt === "conduct" ? " (worth 3)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {type === "offense" && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-600">Offense type</label>
            <select
              required
              value={offenseType}
              onChange={(e) => handleOffenseTypeChange(e.target.value as OffenseType)}
              className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Select…</option>
              {OFFENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {offenseType && (
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-600">Offense</label>
              <select
                required
                value={offenseDetail}
                onChange={(e) => setOffenseDetail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {OFFENSE_DETAILS[offenseType].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value={OFFENSE_DETAIL_OTHER}>Other…</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">{OFFENSE_TYPE_LABELS[offenseType]}</p>
            </div>
          )}
          {offenseDetail === OFFENSE_DETAIL_OTHER && (
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-600">Describe the offense</label>
              <input
                required
                value={offenseDetailOther}
                onChange={(e) => setOffenseDetailOther(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600">DC?</label>
            <select
              value={isDc ? "yes" : "no"}
              onChange={(e) => setIsDc(e.target.value === "yes")}
              className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {isDc && <p className="mt-1 text-xs text-slate-400">Also logs a DC entry.</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Work Detail?</label>
            <select
              value={isWorkDetail ? "yes" : "no"}
              onChange={(e) => setIsWorkDetail(e.target.value === "yes")}
              className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {isWorkDetail && <p className="mt-1 text-xs text-slate-400">Also logs a Work Detail entry.</p>}
          </div>
        </>
      )}
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
        disabled={submitting || !offenseValid}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
