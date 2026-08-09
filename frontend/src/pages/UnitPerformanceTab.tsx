import { useEffect, useState } from "react";
import { bannersApi, metricsApi } from "../api/client";
import type { BannerResult, MetricEntry, MetricType } from "../types";
import { METRIC_LABELS } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import { buildWeeklySeries } from "../lib/weeklyBucket";
import MetricsTrendChart from "../components/MetricsTrendChart";
import BannerSection from "../components/BannerSection";

// Grouped into small multiples — a single chart with 12 series would blow
// past the categorical palette's safe cap (8), so metrics are split into
// facets of at most 6, each recoloring from the same 8-slot palette.
const FACETS: { title: string; types: MetricType[] }[] = [
  {
    title: "Inspections",
    types: [
      "daily_room_inspection_gig",
      "battalion_inspection_gig",
      "major_green_inspection_gig",
      "regimental_inspection_gig",
      "laundry_gig",
    ],
  },
  {
    title: "Discipline",
    types: ["absence", "negative_epr", "dc", "work_detail", "haircut", "new_cadet_lineup_gig"],
  },
  {
    title: "Recognition",
    types: ["positive_epr"],
  },
];

export default function UnitPerformanceTab() {
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [banners, setBanners] = useState<BannerResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [entriesData, bannersData] = await Promise.all([metricsApi.list(), bannersApi.list()]);
      setEntries(entriesData);
      setBanners(bannersData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Cadet Metrics Over Time</h2>
        <div className="space-y-4">
          {FACETS.map((facet) => {
            const facetEntries = entries.filter((e) => facet.types.includes(e.type));
            const series = buildWeeklySeries(
              facetEntries,
              (e) => e.type,
              facet.types.map((type, i) => ({ key: type, label: METRIC_LABELS[type], color: CATEGORICAL_COLORS[i] })),
            );
            return <MetricsTrendChart key={facet.title} title={facet.title} series={series} />;
          })}
        </div>
      </div>

      <BannerSection results={banners} onChanged={load} />
    </div>
  );
}
