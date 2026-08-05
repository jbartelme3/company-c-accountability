import { useState } from "react";
import { ApiError } from "../api/client";
import {
  BATTALION_POSITIONS,
  POSITION_MIN_RANK,
  RANKS,
  RANK_ABBREVIATIONS,
  REGIMENTAL_POSITIONS,
  UNIT_POSITIONS,
  formatRank,
  rankAfterPositionChange,
} from "../types";

export interface CadetFormValues {
  first_name: string;
  last_name: string;
  position: string;
  rank: string | null;
}

export default function CadetForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CadetFormValues>;
  submitLabel: string;
  onSubmit: (values: CadetFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "New Cadet");
  const [rank, setRank] = useState(initial?.rank ?? "New Cadet");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // "Position makes the rank": moving to a position with a higher minimum
  // bumps rank up to match; moving to a lower-minimum position never
  // demotes — the current rank is left as-is. The rank field stays editable
  // afterward for manual corrections (e.g. a disciplinary reduction).
  function handlePositionChange(newPosition: string) {
    setPosition(newPosition);
    setRank((currentRank) => rankAfterPositionChange(currentRank, newPosition));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ first_name: firstName, last_name: lastName, position, rank: rank || null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">First name</label>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Last name</label>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Rank</label>
          <select
            value={rank ?? ""}
            onChange={(e) => setRank(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r} ({RANK_ABBREVIATIONS[r]})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">Minimum for {position}: {formatRank(POSITION_MIN_RANK[position] ?? null)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Position</label>
          <select
            value={position}
            onChange={(e) => handlePositionChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            <optgroup label="Company C (Unit)">
              {UNIT_POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </optgroup>
            <optgroup label="Infantry Battalion Staff">
              {BATTALION_POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </optgroup>
            <optgroup label="Regimental Staff">
              {REGIMENTAL_POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
