import { useState } from "react";
import type { Cadet, MetricEntry } from "../types";
import { OFFENSE_TYPES } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import { buildWeeklySeries } from "../lib/weeklyBucket";
import MetricsTrendChart from "./MetricsTrendChart";
import MetricsByCadetChart from "./MetricsByCadetChart";
import ByTypeByCadetToggle, { type ChartMode } from "./ByTypeByCadetToggle";

// Offenses aren't a gig (see worker/lib/metrics.ts isGigScored), so this
// isn't part of the generic FACETS loop in UnitPerformanceTab — it has two
// switchable views instead of one: "By Type" (the Type I-IV weekly trend,
// same shape as every other facet) and "By Cadet" (who's actually racking
// them up, broken down by Type I-IV rather than by metric type).
export default function OffensesSection({ entries, cadets }: { entries: MetricEntry[]; cadets: Cadet[] }) {
  const [mode, setMode] = useState<ChartMode>("type");
  const offenseEntries = entries.filter((e) => e.type === "offense");

  const offenseSubTypes = OFFENSE_TYPES.map((t, i) => ({ key: t, label: t, color: CATEGORICAL_COLORS[i] }));

  const typeSeries = buildWeeklySeries(offenseEntries, (e) => e.offense_type ?? "Type IV", offenseSubTypes);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ByTypeByCadetToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "type" ? (
        <MetricsTrendChart title="Offenses" series={typeSeries} />
      ) : (
        <MetricsByCadetChart
          title="Offenses by Cadet"
          entries={offenseEntries}
          cadets={cadets}
          subTypes={offenseSubTypes}
          subTypeOf={(e) => e.offense_type ?? "Type IV"}
        />
      )}
    </div>
  );
}
