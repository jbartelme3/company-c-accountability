export type ChartMode = "type" | "cadet";

// Shared pill toggle for every metrics chart's "By Type"/"By Cadet" switch
// (see MetricsFacetSection and OffensesSection) — one look everywhere.
export default function ByTypeByCadetToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs font-medium">
      <button
        onClick={() => onChange("type")}
        className={`px-2.5 py-1 ${mode === "type" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
      >
        By Type
      </button>
      <button
        onClick={() => onChange("cadet")}
        className={`border-l border-slate-300 px-2.5 py-1 ${
          mode === "cadet" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        By Cadet
      </button>
    </div>
  );
}
