import { Hono } from "hono";
import type { Env, CadetRow, MetricEntryRow } from "../types";
import { serializeCadet, serializeMetricEntry } from "../lib/serialize";
import { METRIC_TYPES, METRIC_POLARITY, rankAfterPositionChange } from "../lib/metrics";

export const cadets = new Hono<{ Bindings: Env }>();

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

// GET /api/cadets
cadets.get("/", async (c) => {
  const { DB } = c.env;
  const { results } = await DB.prepare(
    `${SELECT_CADETS_WITH_NEGATIVE_COUNT} ORDER BY c.last_name COLLATE NOCASE, c.first_name COLLATE NOCASE`,
  )
    .bind(...NEGATIVE_TYPES)
    .all<CadetRowWithCount>();
  return c.json(results.map(serializeCadetWithCount));
});

// GET /api/cadets/:id
cadets.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const cadet = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(id).first<CadetRow>();
  if (!cadet) return c.json({ error: "Cadet not found" }, 404);

  const { results: entries } = await DB.prepare(
    "SELECT * FROM metric_entries WHERE cadet_id = ? ORDER BY entry_date DESC, id DESC",
  )
    .bind(id)
    .all<MetricEntryRow>();

  return c.json({
    ...serializeCadet(cadet),
    metric_entries: entries.map(serializeMetricEntry),
  });
});

// POST /api/cadets
cadets.post("/", async (c) => {
  const body = await c.req.json<{
    first_name: string;
    last_name: string;
    position: string;
    rank?: string | null;
  }>();

  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return c.json({ error: "first_name and last_name are required" }, 400);
  }

  const { DB } = c.env;
  const position = body.position?.trim() || "New Cadet";
  // A newly-created cadet can't already hold a rank earned from a prior
  // position, so their rank is simply clamped to at least this position's
  // minimum (see rankAfterPositionChange).
  const rank = rankAfterPositionChange(body.rank?.trim() || null, position);

  const result = await DB.prepare(
    `INSERT INTO cadets (first_name, last_name, position, rank, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  )
    .bind(body.first_name.trim(), body.last_name.trim(), position, rank)
    .run();

  const cadet = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(result.meta.last_row_id).first<CadetRow>();
  return c.json(serializeCadet(cadet!), 201);
});

// PATCH /api/cadets/:id
cadets.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(id).first<CadetRow>();
  if (!existing) return c.json({ error: "Cadet not found" }, 404);

  const body = await c.req.json<Partial<{ first_name: string; last_name: string; position: string; rank: string | null }>>();

  const position = body.position?.trim() ?? existing.position;
  const requestedRank = body.rank !== undefined ? body.rank?.trim() || null : existing.rank;

  // "Position makes the rank": moving to a position with a higher minimum
  // bumps rank up to match, but a move to a lower-minimum position never
  // demotes — the cadet keeps whatever rank they've already earned. This
  // only applies when position is actually changing; a rank-only edit (e.g.
  // a disciplinary reduction with no position change) is always respected as
  // given.
  const merged = {
    first_name: body.first_name?.trim() ?? existing.first_name,
    last_name: body.last_name?.trim() ?? existing.last_name,
    position,
    rank: position !== existing.position ? rankAfterPositionChange(requestedRank, position) : requestedRank,
  };

  await DB.prepare(
    `UPDATE cadets SET first_name = ?, last_name = ?, position = ?, rank = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(merged.first_name, merged.last_name, merged.position, merged.rank, id)
    .run();

  const updated = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(id).first<CadetRow>();
  return c.json(serializeCadet(updated!));
});

// DELETE /api/cadets/:id
cadets.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id FROM cadets WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Cadet not found" }, 404);

  await DB.prepare("DELETE FROM cadets WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});
