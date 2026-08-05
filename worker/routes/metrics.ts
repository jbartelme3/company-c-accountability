import { Hono } from "hono";
import type { Env, CadetRow, MetricEntryRow } from "../types";
import { LAUNDRY_TYPES, METRIC_TYPES, isEligibleForNewCadetLineupGig, type LaundryType, type MetricType } from "../lib/metrics";
import { serializeMetricEntry } from "../lib/serialize";

export const metrics = new Hono<{ Bindings: Env }>();

type RowWithCadet = MetricEntryRow & {
  cadet_first_name: string;
  cadet_last_name: string;
  cadet_position: string;
};

function serializeWithCadet(row: RowWithCadet) {
  return {
    ...serializeMetricEntry(row),
    cadet_name: `${row.cadet_first_name} ${row.cadet_last_name}`,
    cadet_position: row.cadet_position,
  };
}

const SELECT_WITH_CADET = `
  SELECT m.*, c.first_name AS cadet_first_name, c.last_name AS cadet_last_name, c.position AS cadet_position
  FROM metric_entries m
  JOIN cadets c ON c.id = m.cadet_id
`;

// GET /api/metrics?type=dc&cadet_id=3
metrics.get("/", async (c) => {
  const type = c.req.query("type");
  const cadetId = c.req.query("cadet_id");
  const { DB } = c.env;

  if (type && !METRIC_TYPES.includes(type as MetricType)) {
    return c.json({ error: `Invalid type. Must be one of: ${METRIC_TYPES.join(", ")}` }, 400);
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (type) {
    conditions.push("m.type = ?");
    params.push(type);
  }
  if (cadetId) {
    conditions.push("m.cadet_id = ?");
    params.push(Number(cadetId));
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const stmt = DB.prepare(
    `${SELECT_WITH_CADET} ${where} ORDER BY m.entry_date DESC, m.id DESC`,
  ).bind(...params);

  const { results } = await stmt.all<RowWithCadet>();
  return c.json(results.map(serializeWithCadet));
});

// POST /api/metrics
metrics.post("/", async (c) => {
  const body = await c.req.json<{
    cadet_id: number;
    type: MetricType;
    laundry_type?: LaundryType | null;
    entry_date?: string;
    note?: string | null;
  }>();

  if (!METRIC_TYPES.includes(body.type)) {
    return c.json({ error: `Invalid type. Must be one of: ${METRIC_TYPES.join(", ")}` }, 400);
  }
  if (!body.cadet_id) {
    return c.json({ error: "cadet_id is required" }, 400);
  }
  if (body.type === "laundry_gig" && !LAUNDRY_TYPES.includes(body.laundry_type as LaundryType)) {
    return c.json({ error: `laundry_type is required for a Laundry Gig and must be one of: ${LAUNDRY_TYPES.join(", ")}` }, 400);
  }

  const { DB } = c.env;
  const cadet = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(body.cadet_id).first<CadetRow>();
  if (!cadet) return c.json({ error: "Cadet not found" }, 404);

  if (body.type === "new_cadet_lineup_gig" && !isEligibleForNewCadetLineupGig(cadet)) {
    return c.json(
      { error: "New Cadet Lineup Gigs only apply to cadets holding the New Cadet position at the New Cadet/Private/PFC rank." },
      400,
    );
  }

  const entryDate = body.entry_date?.trim() || new Date().toISOString().slice(0, 10);
  const laundryType = body.type === "laundry_gig" ? body.laundry_type : null;

  const result = await DB.prepare(
    `INSERT INTO metric_entries (cadet_id, type, laundry_type, entry_date, note, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(body.cadet_id, body.type, laundryType, entryDate, body.note?.trim() || null)
    .run();

  const row = await DB.prepare(`${SELECT_WITH_CADET} WHERE m.id = ?`).bind(result.meta.last_row_id).first<RowWithCadet>();
  return c.json(serializeWithCadet(row!), 201);
});

// PATCH /api/metrics/:id
metrics.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT * FROM metric_entries WHERE id = ?").bind(id).first<MetricEntryRow>();
  if (!existing) return c.json({ error: "Metric entry not found" }, 404);

  const body = await c.req.json<Partial<{ entry_date: string; note: string | null; laundry_type: LaundryType | null }>>();

  if (existing.type === "laundry_gig" && body.laundry_type !== undefined && !LAUNDRY_TYPES.includes(body.laundry_type as LaundryType)) {
    return c.json({ error: `laundry_type must be one of: ${LAUNDRY_TYPES.join(", ")}` }, 400);
  }

  const merged = {
    entry_date: body.entry_date?.trim() ?? existing.entry_date,
    note: body.note !== undefined ? body.note?.trim() || null : existing.note,
    laundry_type: existing.type === "laundry_gig" ? (body.laundry_type ?? existing.laundry_type) : existing.laundry_type,
  };

  await DB.prepare("UPDATE metric_entries SET entry_date = ?, note = ?, laundry_type = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(merged.entry_date, merged.note, merged.laundry_type, id)
    .run();

  const row = await DB.prepare(`${SELECT_WITH_CADET} WHERE m.id = ?`).bind(id).first<RowWithCadet>();
  return c.json(serializeWithCadet(row!));
});

// DELETE /api/metrics/:id
metrics.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id FROM metric_entries WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Metric entry not found" }, 404);

  await DB.prepare("DELETE FROM metric_entries WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});
