import { useEffect, useState } from "react";
import { bannersApi, cadetsApi, makePeriodsApi, metricsApi } from "../api/client";
import type { BannerResult, Cadet, MakePeriod, MetricEntry, MetricType } from "../types";
import { LINEUP_GIG_TYPES, LINEUP_GIG_TYPE_LABELS } from "../types";
import { CATEGORICAL_COLORS } from "../lib/chartPalette";
import type { ByCadetSubType } from "../components/MetricsByCadetChart";
import MetricsFacetSection from "../components/MetricsFacetSection";
import BannerSection from "../components/BannerSection";
import MakePeriodsEditor from "../components/MakePeriodsEditor";
import OffensesSection from "../components/OffensesSection";

// Grouped into small multiples — a single chart with 12 series would blow
// past the categorical palette's safe cap (8), so metrics are split into
// facets of at most 6, each recoloring from the same 8-slot palette. Every
// facet is scoped to real gig categories/weights (see gigWeight in
// types.ts) rather than the old flat "Discipline"/"Inspections" grouping.
// Every facet gets the same By Type/By Cadet toggle (see MetricsFacetSection).
//
// Offenses isn't in this list — it's not gig-weighted at all, and its By
// Cadet view breaks down by offense_type rather than metric type, so it's
// rendered as its own section below (see OffensesSection).
interface Facet {
  title: string;
  types: MetricType[];
  subtitle?: string;
  byCadet?: {
    subTypes: ByCadetSubType[];
    subTypeOf: (e: MetricEntry) => string;
  };
}

// New Cadet Lineup Gigs only has one metric type, so By Cadet is more useful
// split by lineup_gig_type (Room/Uniform/Conduct/Common Knowledge) instead.
const LINEUP_GIG_BY_CADET = {
  subTypes: LINEUP_GIG_TYPES.map((t, i) => ({
    key: t,
    label: LINEUP_GIG_TYPE_LABELS[t] + (t === "conduct" ? " (3)" : ""),
    color: CATEGORICAL_COLORS[i],
  })),
  subTypeOf: (e: MetricEntry) => e.lineup_gig_type ?? "room",
};

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
  },
  {
    title: "New Cadet Lineup Gigs",
    types: ["new_cadet_lineup_gig"],
    subtitle: "Conduct Gigs count as 3, everything else as 1. Excluded from Team/Squad/Platoon standings.",
    byCadet: LINEUP_GIG_BY_CADET,
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
          {FACETS.map((facet) => (
            <MetricsFacetSection
              key={facet.title}
              title={facet.title}
              subtitle={facet.subtitle}
              types={facet.types}
              entries={entries}
              cadets={cadets}
              byCadet={facet.byCadet}
            />
          ))}

          <OffensesSection entries={entries} cadets={cadets} />
        </div>
      </div>

      <BannerSection results={banners} onChanged={load} />
    </div>
  );
}
