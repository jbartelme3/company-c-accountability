import { useState } from "react";
import { ApiError, makePeriodsApi } from "../api/client";
import type { MakePeriod } from "../types";
import { MAKE_NUMBERS } from "../types";

// Cadre-facing settings form for the 3 makes' date ranges — the only piece
// of config the auto Team/Squad/Platoon/New-Cadet of the Make standings
// need (see lib/periods.ts findCurrentMake). Lives on the Unit Performance
// tab since Make is already a concept there (Banner Results).
export default function MakePeriodsEditor({ periods, onChanged }: { periods: MakePeriod[]; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(periods.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [savingMake, setSavingMake] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { start_date: string; end_date: string }>>(() => {
    const initial: Record<number, { start_date: string; end_date: string }> = {};
    for (const m of MAKE_NUMBERS) {
      const existing = periods.find((p) => p.make_number === m);
      initial[m] = { start_date: existing?.start_date ?? "", end_date: existing?.end_date ?? "" };
    }
    return initial;
  });

  function setDraft(makeNumber: number, field: "start_date" | "end_date", value: string) {
    setDrafts((prev) => ({ ...prev, [makeNumber]: { ...prev[makeNumber], [field]: value } }));
  }

  async function save(makeNumber: number) {
    const draft = drafts[makeNumber];
    if (!draft.start_date || !draft.end_date) {
      setError("Both a start and end date are required.");
      return;
    }
    setError(null);
    setSavingMake(makeNumber);
    try {
      await makePeriodsApi.upsert(makeNumber, draft);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save make dates.");
    } finally {
      setSavingMake(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-slate-800">Make Periods</span>
        <span className="text-xs font-medium text-slate-500">{expanded ? "Hide" : "Edit make dates"}</span>
      </button>
      <p className="mt-1 text-xs text-slate-500">
        Set each make's date range so Team/Squad/Platoon and New Cadet of the Make can be tracked automatically.
      </p>

      {expanded && (
        <div className="mt-3 space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {MAKE_NUMBERS.map((m) => (
            <div key={m} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm font-semibold text-slate-700">Make {m}</span>
              <div>
                <label className="block text-xs font-medium text-slate-600">Start date</label>
                <input
                  type="date"
                  value={drafts[m].start_date}
                  onChange={(e) => setDraft(m, "start_date", e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">End date</label>
                <input
                  type="date"
                  value={drafts[m].end_date}
                  onChange={(e) => setDraft(m, "end_date", e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={() => save(m)}
                disabled={savingMake === m}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {savingMake === m ? "Saving…" : "Save"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
