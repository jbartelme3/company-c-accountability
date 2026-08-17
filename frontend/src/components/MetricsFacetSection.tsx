import { useState } from "react";
import type { Cadet, MetricEntry, MetricType } from "../types";
import { METRIC_LABELS, gigWeight, lineupGigWeight } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import { buildWeeklySeries } from "../lib/weeklyBucket";
import MetricsTrendChart from "./MetricsTrendChart";
import MetricsByCadetChart, { type ByCadetSubType } from "./MetricsByCadetChart";
import ByTypeByCadetToggle, { type ChartMode } from "./ByTypeByCadetToggle";

// New Cadet Lineup Gigs weight per-entry (Conduct Gig = 3, others = 1);
// every other facet weights by type (see gigWeight in types.ts).
function weightFor(type: MetricType, e: MetricEntry): number {
  return type === "new_cadet_lineup_gig" ? lineupGigWeight(e.lineup_gig_type) : gigWeight(type);
}

// One Cadet Metrics Over Time facet — a weekly trend (By Type) or a ranked
// per-cadet breakdown (By Cadet), switched with the same toggle every chart
// in the app uses (see ByTypeByCadetToggle). By default the By Cadet
// breakdown splits by metric type (one segment per type in the facet); pass
// `byCadet` to split by something more meaningful instead — e.g. New Cadet
// Lineup Gigs splits by lineup_gig_type, not by its one metric type.
export default function MetricsFacetSection({
  title,
  subtitle,
  types,
  entries,
  cadets,
  byCadet,
}: {
  title: string;
  subtitle?: string;
  types: MetricType[];
  entries: MetricEntry[];
  cadets: Cadet[];
  byCadet?: {
    subTypes: ByCadetSubType[];
    subTypeOf: (e: MetricEntry) => string;
  };
}) {
  const [mode, setMode] = useState<ChartMode>("type");
  const facetEntries = entries.filter((e) => types.includes(e.type));

  const typeSeries = buildWeeklySeries(
    facetEntries,
    (e) => e.type,
    types.map((type, i) => ({
      key: type,
      label: METRIC_LABELS[type],
      color: CATEGORICAL_COLORS[i],
      weight: (e: MetricEntry) => weightFor(type, e),
    })),
  );

  const cadetSubTypes = byCadet?.subTypes ?? types.map((type, i) => ({ key: type, label: METRIC_LABELS[type], color: CATEGORICAL_COLORS[i] }));
  const cadetSubTypeOf = byCadet?.subTypeOf ?? ((e: MetricEntry) => e.type);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ByTypeByCadetToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "type" ? (
        <MetricsTrendChart title={title} subtitle={subtitle} series={typeSeries} />
      ) : (
        <MetricsByCadetChart
          title={`${title} by Cadet`}
          entries={facetEntries}
          cadets={cadets}
          subTypes={cadetSubTypes}
          subTypeOf={cadetSubTypeOf}
          weightOf={(e) => weightFor(e.type, e)}
        />
      )}
    </div>
  );
}
