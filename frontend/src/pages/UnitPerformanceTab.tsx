import { useEffect, useState } from "react";
import { bannersApi, cadetsApi, makePeriodsApi, metricsApi } from "../api/client";
import type { BannerResult, Cadet, MakePeriod, MetricEntry, MetricType } from "../types";
import { METRIC_LABELS, gigWeight, lineupGigWeight } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import { buildWeeklySeries } from "../lib/weeklyBucket";
import MetricsTrendChart from "../components/MetricsTrendChart";
import BannerSection from "../components/BannerSection";
import MakePeriodsEditor from "../components/MakePeriodsEditor";
import OffensesSection from "../components/OffensesSection";

// Grouped into small multiples — a single chart with 12 series would blow
// past the categorical palette's safe cap (8), so metrics are split into
// facets of at most 6, each recoloring from the same 8-slot palette. Every
// facet is scoped to real gig categories/weights (see gigWeight in
// types.ts) rather than the old flat "Discipline"/"Inspections" grouping.
//
// Offenses isn't in this list — it's not gig-weighted at all, and has its
// own By Type/By Cadet mode switch (see OffensesSection), so it's rendered
// as its own section below rather than through this generic per-metric-type loop.
interface Facet {
  title: string;
  types: MetricType[];
  subtitle?: string;
}

const FACETS: Facet[] = [
  {
    title: "Room Inspection Gigs",
    types: ["daily_room_inspection_gig"],
    subtitle: "Each entry counts as 1 gig.",
  },
  {
    title: "Inspection (BRC/DRC/Reg/Laundry/Major) Gigs",
    types: ["brc_inspection_gig", "drc_inspection_gig", "regimental_inspection_gig", "laundry_gig", "major_green_inspection_gig"],
    subtitle: "Each entry counts as 3 gigs.",
  },
  {
    title: "Disciplinary Gigs",
    types: ["dc", "atv"],
    subtitle: "Each entry counts as 3 gigs.",
  },
  {
    title: "Work Details",
    types: ["work_detail"],
    subtitle: "Each entry counts as 1 gig.",
  },
  {
    title: "Other",
    types: ["other"],
    subtitle: "Each entry counts as 1 gig.",
  },
  {
    title: "Absences",
    types: ["absence"],
  },
  {
    title: "Extra",
    types: ["positive_epr", "negative_epr", "haircut"],
    subtitle: "Informational — not part of gig standings.",
  },
  {
    title: "New Cadet Lineup Gigs",
    types: ["new_cadet_lineup_gig"],
    subtitle: "Conduct Gigs count as 3, everything else as 1. Excluded from Team/Squad/Platoon standings.",
  },
];

export default function UnitPerformanceTab() {
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [banners, setBanners] = useState<BannerResult[]>([]);
  const [makePeriods, setMakePeriods] = useState<MakePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [entriesData, cadetsData, bannersData, periods] = await Promise.all([
        metricsApi.list(),
        cadetsApi.list(),
        bannersApi.list(),
        makePeriodsApi.list(),
      ]);
      setEntries(entriesData);
      setCadets(cadetsData);
      setBanners(bannersData);
      setMakePeriods(periods);
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
      <MakePeriodsEditor periods={makePeriods} onChanged={load} />

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Cadet Metrics Over Time</h2>
        <div className="space-y-4">
          {FACETS.map((facet) => {
            const facetEntries = entries.filter((e) => facet.types.includes(e.type));
            const series = buildWeeklySeries(
              facetEntries,
              (e) => e.type,
              facet.types.map((type, i) => ({
                key: type,
                label: METRIC_LABELS[type],
                color: CATEGORICAL_COLORS[i],
                // New Cadet Lineup Gigs weight per-entry (Conduct Gig = 3,
                // others = 1); every other facet weights by type.
                weight: type === "new_cadet_lineup_gig" ? (e: MetricEntry) => lineupGigWeight(e.lineup_gig_type) : gigWeight(type),
              })),
            );
            return <MetricsTrendChart key={facet.title} title={facet.title} subtitle={facet.subtitle} series={series} />;
          })}

          <OffensesSection entries={entries} cadets={cadets} />
        </div>
      </div>

      <BannerSection results={banners} onChanged={load} />
    </div>
  );
}
