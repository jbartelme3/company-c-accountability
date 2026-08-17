import { useState } from "react";
import type { Cadet, MetricEntry } from "../types";
import { OFFENSE_TYPES } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import { buildWeeklySeries } from "../lib/weeklyBucket";
import MetricsTrendChart from "./MetricsTrendChart";
import OffenseByCadetChart from "./OffenseByCadetChart";

type Mode = "type" | "cadet";

// Offenses aren't a gig (see worker/lib/metrics.ts isGigScored), so this
// isn't part of the generic FACETS loop in UnitPerformanceTab — it has two
// switchable views instead of one: "By Type" (the Type I-IV weekly trend,
// same shape as every other facet) and "By Cadet" (who's actually racking
// them up — see OffenseByCadetChart).
export default function OffensesSection({ entries, cadets }: { entries: MetricEntry[]; cadets: Cadet[] }) {
  const [mode, setMode] = useState<Mode>("type");
  const offenseEntries = entries.filter((e) => e.type === "offense");

  const typeSeries = buildWeeklySeries(
    offenseEntries,
    (e) => e.offense_type ?? "Type IV",
    OFFENSE_TYPES.map((t, i) => ({ key: t, label: t, color: CATEGORICAL_COLORS[i] })),
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs font-medium">
          <button
            onClick={() => setMode("type")}
            className={`px-2.5 py-1 ${mode === "type" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            By Type
          </button>
          <button
            onClick={() => setMode("cadet")}
            className={`border-l border-slate-300 px-2.5 py-1 ${
              mode === "cadet" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            By Cadet
          </button>
        </div>
      </div>

      {mode === "type" ? (
        <MetricsTrendChart
          title="Offenses"
          subtitle="Culver Type I-IV citizenship infractions — not a gig, informational only. Type I is most serious, Type IV least."
          series={typeSeries}
        />
      ) : (
        <OffenseByCadetChart entries={offenseEntries} cadets={cadets} />
      )}
    </div>
  );
}
