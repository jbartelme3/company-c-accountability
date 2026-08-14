import { useEffect, useState } from "react";
import { ApiError, cadetsApi, conductGigReportsApi } from "../api/client";
import type { Cadet, ConductGigReport } from "../types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ConductGigReportsSection() {
  const [reports, setReports] = useState<ConductGigReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setReports(await conductGigReportsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("Remove this report?")) return;
    setError(null);
    try {
      await conductGigReportsApi.remove(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Conduct Gig Reports</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {showAdd ? "Cancel" : "+ Add Report"}
        </button>
      </div>

      {showAdd && (
        <AddReportForm
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading && <p className="px-4 py-3 text-sm text-slate-400">Loading…</p>}
        {!loading && reports.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No reports yet.</p>}
        {!loading &&
          reports.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-start justify-between px-4 py-2.5 text-sm ${i > 0 ? "border-t border-slate-100" : ""}`}
            >
              <div>
                <p className="text-slate-800">
                  <span className="font-medium">{r.reporter_name}</span> reported{" "}
                  <span className="font-medium">{r.cadet_name}</span> · {r.entry_date}
                </p>
                <p className="mt-0.5 text-slate-500">{r.reasoning}</p>
              </div>
              <button onClick={() => remove(r.id)} className="ml-3 shrink-0 text-xs font-medium text-slate-400 hover:text-red-600">
                Remove
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

function AddReportForm({ onCreated }: { onCreated: () => void }) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [reporterName, setReporterName] = useState("");
  const [cadetId, setCadetId] = useState<number | "">("");
  const [date, setDate] = useState(todayIso());
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cadetsApi.list().then(setCadets);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cadetId) {
      setError("Select a New Cadet.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await conductGigReportsApi.create({
        reporter_name: reporterName.trim(),
        cadet_id: cadetId,
        entry_date: date,
        reasoning: reasoning.trim(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Reporter Name</label>
          <input
            required
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">New Cadet</label>
          <select
            required
            value={cadetId}
            onChange={(e) => setCadetId(e.target.value ? Number(e.target.value) : "")}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">Select…</option>
            {cadets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.last_name}, {c.first_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Date</label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600">Reasoning</label>
          <textarea
            required
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={3}
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
        {submitting ? "Saving…" : "Add Report"}
      </button>
    </form>
  );
}
