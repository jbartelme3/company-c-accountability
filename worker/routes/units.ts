import { Hono } from "hono";
import type { CadetRow, Env } from "../types";
import { serializeCadet } from "../lib/serialize";
import {
  METRIC_TYPES,
  METRIC_POLARITY,
  UNIT_TYPES,
  UNIT_ELIGIBILITY,
  UNIT_LEADER_COLUMN,
  LEADER_POSITION_FOR_UNIT,
  type MetricType,
  type UnitType,
} from "../lib/metrics";

export const units = new Hono<{ Bindings: Env }>();

const NEGATIVE_TYPES = METRIC_TYPES.filter((t) => METRIC_POLARITY[t] === "negative");
const NEGATIVE_IN_CLAUSE = NEGATIVE_TYPES.map(() => "?").join(", ");

const SELECT_CADETS_WITH_NEGATIVE_COUNT = `
  SELECT c.*, (
    SELECT COUNT(*) FROM metric_entries m
    WHERE m.cadet_id = c.id AND m.type IN (${NEGATIVE_IN_CLAUSE})
  ) AS negative_count
  FROM cadets c
`;

type CadetRowWithCount = CadetRow & { negative_count: number };

function serializeCadetWithCount(row: CadetRowWithCount) {
  return { ...serializeCadet(row), negative_count: row.negative_count };
}

function emptyMetricTotals(): Record<MetricType, number> {
  const totals = {} as Record<MetricType, number>;
  for (const t of METRIC_TYPES) totals[t] = 0;
  return totals;
}

function isUnitType(value: string): value is UnitType {
  return (UNIT_TYPES as string[]).includes(value);
}

// GET /api/units/:type (team | squad | platoon) — compiles every cadet
// eligible for that unit type into groups led by whoever currently holds the
// matching leader billet, with each group's metrics summed across its
// members. Cadets who are eligible but not yet assigned a leader come back
// separately under `unassigned`.
units.get("/:type", async (c) => {
  const type = c.req.param("type");
  if (!isUnitType(type)) {
    return c.json({ error: `type must be one of: ${UNIT_TYPES.join(", ")}` }, 400);
  }

  const { DB } = c.env;
  const column = UNIT_LEADER_COLUMN[type];
  const leaderPosition = LEADER_POSITION_FOR_UNIT[type];
  const isEligible = UNIT_ELIGIBILITY[type];

  const [{ results: cadetRows }, { results: metricRows }] = await Promise.all([
    DB.prepare(`${SELECT_CADETS_WITH_NEGATIVE_COUNT} ORDER BY c.last_name COLLATE NOCASE, c.first_name COLLATE NOCASE`)
      .bind(...NEGATIVE_TYPES)
      .all<CadetRowWithCount>(),
    DB.prepare("SELECT cadet_id, type, COUNT(*) AS cnt FROM metric_entries GROUP BY cadet_id, type").all<{
      cadet_id: number;
      type: MetricType;
      cnt: number;
    }>(),
  ]);

  const metricsByCadet = new Map<number, Record<MetricType, number>>();
  for (const row of metricRows) {
    const totals = metricsByCadet.get(row.cadet_id) ?? emptyMetricTotals();
    totals[row.type] = row.cnt;
    metricsByCadet.set(row.cadet_id, totals);
  }

  const cadets = cadetRows.map(serializeCadetWithCount);
  const eligible = cadets.filter((c) => isEligible(c.position));
  const leaders = eligible.filter((c) => c.position === leaderPosition);

  const unitsList = leaders.map((leader) => {
    const members = eligible.filter((c) => c[column] === leader.id);
    const metric_totals = emptyMetricTotals();
    let negative_total = 0;
    for (const member of members) {
      negative_total += member.negative_count ?? 0;
      const memberTotals = metricsByCadet.get(member.id);
      if (!memberTotals) continue;
      for (const t of METRIC_TYPES) metric_totals[t] += memberTotals[t] ?? 0;
    }
    return { leader, members, metric_totals, negative_total };
  });

  const unassigned = eligible.filter((c) => c.position !== leaderPosition && c[column] == null);

  return c.json({ units: unitsList, unassigned });
});
