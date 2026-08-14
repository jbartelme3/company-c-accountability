import { useEffect, useState } from "react";
import { cadetsApi } from "../api/client";
import type { Cadet, CadetProfile as CadetProfileType } from "../types";
import { CLASS_YEARS, POSITIONS, RANKS } from "../types";
import CadetProfile from "./CadetProfile";
import CadetRow from "../components/CadetRow";
import AddCadetForm from "../components/AddCadetForm";
import MetricEntryModal from "../components/MetricEntryModal";

export default function CadetsTab() {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCadetId, setSelectedCadetId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingCadet, setAddingCadet] = useState<CadetProfileType | null>(null);

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPosition, setFilterPosition] = useState("");
  const [filterRank, setFilterRank] = useState("");
  const [filterCadre, setFilterCadre] = useState("");
  const [filterClassYear, setFilterClassYear] = useState("");

  async function load() {
    setLoading(true);
    try {
      setCadets(await cadetsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openAdd(cadetId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setAddingCadet(await cadetsApi.get(cadetId));
  }

  async function refreshAddingCadet() {
    if (!addingCadet) return;
    setAddingCadet(await cadetsApi.get(addingCadet.id));
    load();
  }

  if (selectedCadetId !== null) {
    return (
      <CadetProfile
        cadetId={selectedCadetId}
        onBack={() => {
          setSelectedCadetId(null);
          load();
        }}
      />
    );
  }

  const isFiltering =
    search.trim() !== "" || filterPosition !== "" || filterRank !== "" || filterCadre !== "" || filterClassYear !== "";

  const filteredCadets = cadets.filter((c) => {
    if (search.trim() && !`${c.first_name} ${c.last_name}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterPosition && c.position !== filterPosition) return false;
    if (filterRank && c.rank !== filterRank) return false;
    if (filterCadre === "yes" && !c.is_cadre) return false;
    if (filterCadre === "no" && c.is_cadre) return false;
    if (filterClassYear && c.class_year !== filterClassYear) return false;
    return true;
  });

  function clearFilters() {
    setSearch("");
    setFilterPosition("");
    setFilterRank("");
    setFilterCadre("");
    setFilterClassYear("");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Cadets</h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {showAddForm ? "Cancel" : "+ Add Cadet"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6">
          <AddCadetForm
            onCreated={() => {
              setShowAddForm(false);
              load();
            }}
          />
        </div>
      )}

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cadets by name…"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Filters{filterPosition || filterRank || filterCadre || filterClassYear ? " •" : ""}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={filterClassYear}
              onChange={(e) => setFilterClassYear(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All class years</option>
              {CLASS_YEARS.map((cy) => (
                <option key={cy} value={cy}>
                  {cy}
                </option>
              ))}
            </select>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All positions</option>
              {POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </select>
            <select value={filterRank} onChange={(e) => setFilterRank(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All ranks</option>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select value={filterCadre} onChange={(e) => setFilterCadre(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Cadre: any</option>
              <option value="yes">Cadre only</option>
              <option value="no">Non-Cadre only</option>
            </select>
          </div>
        )}

        {isFiltering && (
          <button onClick={clearFilters} className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-800">
            Clear search &amp; filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading && <p className="px-4 py-3 text-sm text-slate-400">Loading…</p>}
        {!loading && filteredCadets.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No cadets match.</p>}
        {!loading &&
          filteredCadets.map((cadet) => (
            <CadetRow
              key={cadet.id}
              cadet={cadet}
              onSelect={() => setSelectedCadetId(cadet.id)}
              onAdd={(e) => openAdd(cadet.id, e)}
            />
          ))}
      </div>

      {addingCadet && (
        <MetricEntryModal
          cadetId={addingCadet.id}
          cadetName={`${addingCadet.first_name} ${addingCadet.last_name}`}
          cadet={addingCadet}
          type={null}
          entries={addingCadet.metric_entries}
          onClose={() => setAddingCadet(null)}
          onChanged={refreshAddingCadet}
        />
      )}
    </div>
  );
}
