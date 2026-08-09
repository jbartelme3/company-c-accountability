import { useState } from "react";
import { ApiError, unitAwardsApi } from "../api/client";
import type { Cadet, UnitAward, UnitType } from "../types";
import { UNIT_TYPE_LABELS } from "../types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function UnitOfWeekSection({
  unitType,
  awards,
  leaders,
  onChanged,
}: {
  unitType: UnitType;
  awards: UnitAward[];
  leaders: Cadet[];
  onChanged: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = UNIT_TYPE_LABELS[unitType];

  // `awards` is already ordered entry_date desc, id desc by the API.
  const current = awards[0];

  const winCounts = new Map<number, number>();
  for (const a of awards) winCounts.set(a.leader_cadet_id, (winCounts.get(a.leader_cadet_id) ?? 0) + 1);
  const topWinner = [...winCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topWinnerName = topWinner ? awards.find((a) => a.leader_cadet_id === topWinner[0])?.leader_name : null;

  async function remove(id: number) {
    if (!confirm(`Remove this ${label} of the Week entry?`)) return;
    setError(null);
    try {
      await unitAwardsApi.remove(id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{label} of the Week</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          disabled={leaders.length === 0}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {showAdd ? "Cancel" : "+ Record Winner"}
        </button>
      </div>

      {leaders.length === 0 && (
        <p className="text-sm text-slate-400">
          No {LEADER_HELP_TEXT[unitType]} on the roster yet. Nothing to record a winner for.
        </p>
      )}

      {showAdd && (
        <AddAwardForm
          unitType={unitType}
          leaders={leaders}
          onCreated={() => {
            setShowAdd(false);
            onChanged();
          }}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {current && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Current {label} of the Week</p>
          <p className="mt-1 text-lg font-bold text-amber-900">
            {current.leader_name}'s {label}
          </p>
          <p className="text-xs text-amber-700">
            Week of {current.entry_date}
            {current.note ? ` · ${current.note}` : ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile label="Weeks logged" value={String(awards.length)} />
        <StatTile label="Most wins" value={topWinnerName ? `${topWinnerName} (${topWinner![1]})` : "-"} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">{label}</th>
                <th className="px-4 py-2">Note</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {awards.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-slate-400">
                    No {label} of the Week logged yet.
                  </td>
                </tr>
              )}
              {awards.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-800">{a.entry_date}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {a.leader_name}'s {label}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{a.note ?? "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(a.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const LEADER_HELP_TEXT: Record<UnitType, string> = {
  team: "Team Leaders",
  squad: "Squad Leaders",
  platoon: "Platoon Leaders",
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AddAwardForm({
  unitType,
  leaders,
  onCreated,
}: {
  unitType: UnitType;
  leaders: Cadet[];
  onCreated: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [leaderId, setLeaderId] = useState<string>(leaders[0] ? String(leaders[0].id) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const label = UNIT_TYPE_LABELS[unitType];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await unitAwardsApi.create({
        entry_date: date,
        unit_type: unitType,
        leader_cadet_id: Number(leaderId),
        note: note.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record winner.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Week of</label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">{label}</label>
          <select
            required
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.first_name} {l.last_name}'s {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Record Winner"}
      </button>
    </form>
  );
}
