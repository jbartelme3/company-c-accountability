import { useEffect, useState } from "react";
import { metricsApi, ApiError } from "../api/client";
import type { MetricEntry, MetricType } from "../types";
import { METRIC_LABELS, METRIC_TYPE_ORDER } from "../types";
import MetricsTable from "../components/MetricsTable";
import MetricsResultsTable from "../components/MetricsResultsTable";

export default function MetricsTab() {
  const [open, setOpen] = useState<MetricType | null>(null);
  const [entriesByType, setEntriesByType] = useState<Partial<Record<MetricType, MetricEntry[]>>>({});
  const [loading, setLoading] = useState<MetricType | null>(null);

  const [allEntries, setAllEntries] = useState<MetricEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<MetricType | "">("");
  const [error, setError] = useState<string | null>(null);

  async function loadType(type: MetricType) {
    setLoading(type);
    try {
      const data = await metricsApi.list({ type });
      setEntriesByType((prev) => ({ ...prev, [type]: data }));
    } finally {
      setLoading(null);
    }
  }

  async function loadAll() {
    setAllEntries(await metricsApi.list());
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggle(type: MetricType) {
    const next = open === type ? null : type;
    setOpen(next);
    if (next) loadType(next);
  }

  function refreshAll() {
    if (open) loadType(open);
    loadAll();
  }

  const isFiltering = search.trim() !== "" || filterType !== "";

  const filteredEntries = allEntries.filter((entry) => {
    if (search.trim() && !(entry.cadet_name ?? "").toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterType && entry.type !== filterType) return false;
    return true;
  });

  function clearFilters() {
    setSearch("");
    setFilterType("");
  }

  async function removeEntry(entry: MetricEntry) {
    if (!confirm(`Remove this ${METRIC_LABELS[entry.type]} entry for ${entry.cadet_name}?`)) return;
    setError(null);
    try {
      await metricsApi.remove(entry.id);
      refreshAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove entry.");
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-slate-900">Metrics</h2>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by cadet name…"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Filters{filterType ? " •" : ""}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as MetricType | "")}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All types</option>
              {METRIC_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {METRIC_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFiltering && (
          <button onClick={clearFilters} className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-800">
            Clear search &amp; filters
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {isFiltering ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <MetricsResultsTable entries={filteredEntries} onRemove={removeEntry} />
        </div>
      ) : (
        <div className="space-y-3">
          {METRIC_TYPE_ORDER.map((type) => {
            const isOpen = open === type;
            return (
              <div key={type} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button
                  onClick={() => toggle(type)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-slate-900 hover:bg-slate-50"
                >
                  <span>{METRIC_LABELS[type]}</span>
                  <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 p-4">
                    {loading === type && <p className="text-sm text-slate-400">Loading…</p>}
                    {loading !== type && (
                      <MetricsTable type={type} entries={entriesByType[type] ?? []} onChanged={() => loadType(type)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
