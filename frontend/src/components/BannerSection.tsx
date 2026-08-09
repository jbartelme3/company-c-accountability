import { useState } from "react";
import { bannersApi, ApiError } from "../api/client";
import type { BannerResult } from "../types";
import { MAKE_NUMBERS } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import BannerRankChart from "./BannerRankChart";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BannerSection({ results, onChanged }: { results: BannerResult[]; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Oldest-first for the trend charts.
  const chronological = [...results].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const battalionPoints = chronological.filter((r) => r.battalion_rank != null).map((r) => ({ date: r.entry_date, rank: r.battalion_rank! }));
  const regimentalPoints = chronological
    .filter((r) => r.regimental_rank != null)
    .map((r) => ({ date: r.entry_date, rank: r.regimental_rank! }));

  const battalionWins = results.filter((r) => r.battalion_rank === 1).length;
  const regimentalWins = results.filter((r) => r.regimental_rank === 1).length;
  const avgBattalion = average(results.map((r) => r.battalion_rank));
  const avgRegimental = average(results.map((r) => r.regimental_rank));

  async function remove(id: number) {
    if (!confirm("Remove this banner entry?")) return;
    setError(null);
    try {
      await bannersApi.remove(id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Military Banner Results</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {showAdd ? "Cancel" : "+ Add Weekly Result"}
        </button>
      </div>

      {showAdd && (
        <AddBannerForm
          onCreated={() => {
            setShowAdd(false);
            onChanged();
          }}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile label="Battalion Banner wins" value={`${battalionWins} of ${results.filter((r) => r.battalion_rank != null).length}`} />
        <StatTile label="Regimental Banner wins" value={`${regimentalWins} of ${results.filter((r) => r.regimental_rank != null).length}`} />
        <StatTile label="Average battalion rank" value={avgBattalion != null ? `#${avgBattalion.toFixed(1)} of 3` : "—"} />
        <StatTile label="Average regimental rank" value={avgRegimental != null ? `#${avgRegimental.toFixed(1)} of 9` : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BannerRankChart title="Battalion Banner Rank (lower is better)" color={CATEGORICAL_COLORS[0]} maxRank={3} points={battalionPoints} />
        <BannerRankChart title="Regimental Banner Rank (lower is better)" color={CATEGORICAL_COLORS[1]} maxRank={9} points={regimentalPoints} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Make</th>
                <th className="px-4 py-2">Bat. Rank</th>
                <th className="px-4 py-2">Bat. Score</th>
                <th className="px-4 py-2">Reg. Rank</th>
                <th className="px-4 py-2">Reg. Score</th>
                <th className="px-4 py-2">Note</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-sm text-slate-400">
                    No banner results logged yet.
                  </td>
                </tr>
              )}
              {results.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-800">{r.entry_date}</td>
                  <td className="px-4 py-2 text-slate-600">{r.make_number ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{r.battalion_rank != null ? `#${r.battalion_rank}` : "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{r.battalion_score ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{r.regimental_rank != null ? `#${r.regimental_rank}` : "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{r.regimental_score ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{r.note ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(r.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
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

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AddBannerForm({ onCreated }: { onCreated: () => void }) {
  const [date, setDate] = useState(todayIso());
  const [makeNumber, setMakeNumber] = useState<string>("");
  const [battalionRank, setBattalionRank] = useState<string>("");
  const [battalionScore, setBattalionScore] = useState<string>("");
  const [regimentalRank, setRegimentalRank] = useState<string>("");
  const [regimentalScore, setRegimentalScore] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await bannersApi.create({
        entry_date: date,
        make_number: makeNumber ? Number(makeNumber) : null,
        battalion_rank: battalionRank ? Number(battalionRank) : null,
        battalion_score: battalionScore ? Number(battalionScore) : null,
        regimental_rank: regimentalRank ? Number(regimentalRank) : null,
        regimental_score: regimentalScore ? Number(regimentalScore) : null,
        note: note.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add result.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Week of</label>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Make</label>
          <select value={makeNumber} onChange={(e) => setMakeNumber(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
            <option value="">Not set</option>
            {MAKE_NUMBERS.map((m) => (
              <option key={m} value={m}>
                Make {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Battalion rank (1-3)</label>
          <select value={battalionRank} onChange={(e) => setBattalionRank(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
            <option value="">Not set</option>
            {[1, 2, 3].map((r) => (
              <option key={r} value={r}>
                #{r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Battalion score</label>
          <input
            type="number"
            step="any"
            value={battalionScore}
            onChange={(e) => setBattalionScore(e.target.value)}
            placeholder="optional"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Regimental rank (1-9)</label>
          <select value={regimentalRank} onChange={(e) => setRegimentalRank(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
              <option key={r} value={r}>
                #{r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Regimental score</label>
          <input
            type="number"
            step="any"
            value={regimentalScore}
            onChange={(e) => setRegimentalScore(e.target.value)}
            placeholder="optional"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm" />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Add Result"}
      </button>
    </form>
  );
}
