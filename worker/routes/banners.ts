import { Hono } from "hono";
import type { BannerResultRow, Env } from "../types";
import { serializeBannerResult } from "../lib/serialize";
import { MAKE_NUMBERS } from "../lib/metrics";

export const banners = new Hono<{ Bindings: Env }>();

function validateRank(value: number | null | undefined, min: number, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < min || value > max) {
    return `${label} must be an integer between ${min} and ${max}.`;
  }
  return null;
}

// GET /api/banners
banners.get("/", async (c) => {
  const { DB } = c.env;
  const { results } = await DB.prepare("SELECT * FROM banner_results ORDER BY entry_date DESC, id DESC").all<BannerResultRow>();
  return c.json(results.map(serializeBannerResult));
});

// POST /api/banners
banners.post("/", async (c) => {
  const body = await c.req.json<{
    entry_date: string;
    make_number?: number | null;
    battalion_rank?: number | null;
    battalion_score?: number | null;
    regimental_rank?: number | null;
    regimental_score?: number | null;
    note?: string | null;
  }>();

  if (!body.entry_date?.trim()) {
    return c.json({ error: "entry_date is required" }, 400);
  }
  if (body.make_number != null && !MAKE_NUMBERS.includes(body.make_number)) {
    return c.json({ error: `make_number must be one of: ${MAKE_NUMBERS.join(", ")}` }, 400);
  }
  const battalionError = validateRank(body.battalion_rank, 1, 3, "battalion_rank");
  if (battalionError) return c.json({ error: battalionError }, 400);
  const regimentalError = validateRank(body.regimental_rank, 1, 9, "regimental_rank");
  if (regimentalError) return c.json({ error: regimentalError }, 400);

  const { DB } = c.env;
  const result = await DB.prepare(
    `INSERT INTO banner_results (entry_date, make_number, battalion_rank, battalion_score, regimental_rank, regimental_score, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      body.entry_date.trim(),
      body.make_number ?? null,
      body.battalion_rank ?? null,
      body.battalion_score ?? null,
      body.regimental_rank ?? null,
      body.regimental_score ?? null,
      body.note?.trim() || null,
    )
    .run();

  const row = await DB.prepare("SELECT * FROM banner_results WHERE id = ?").bind(result.meta.last_row_id).first<BannerResultRow>();
  return c.json(serializeBannerResult(row!), 201);
});

// PATCH /api/banners/:id
banners.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT * FROM banner_results WHERE id = ?").bind(id).first<BannerResultRow>();
  if (!existing) return c.json({ error: "Banner result not found" }, 404);

  const body = await c.req.json<
    Partial<{
      entry_date: string;
      make_number: number | null;
      battalion_rank: number | null;
      battalion_score: number | null;
      regimental_rank: number | null;
      regimental_score: number | null;
      note: string | null;
    }>
  >();

  if (body.make_number !== undefined && body.make_number != null && !MAKE_NUMBERS.includes(body.make_number)) {
    return c.json({ error: `make_number must be one of: ${MAKE_NUMBERS.join(", ")}` }, 400);
  }
  const battalionError = body.battalion_rank !== undefined ? validateRank(body.battalion_rank, 1, 3, "battalion_rank") : null;
  if (battalionError) return c.json({ error: battalionError }, 400);
  const regimentalError =
    body.regimental_rank !== undefined ? validateRank(body.regimental_rank, 1, 9, "regimental_rank") : null;
  if (regimentalError) return c.json({ error: regimentalError }, 400);

  const merged = {
    entry_date: body.entry_date?.trim() ?? existing.entry_date,
    make_number: body.make_number !== undefined ? body.make_number : existing.make_number,
    battalion_rank: body.battalion_rank !== undefined ? body.battalion_rank : existing.battalion_rank,
    battalion_score: body.battalion_score !== undefined ? body.battalion_score : existing.battalion_score,
    regimental_rank: body.regimental_rank !== undefined ? body.regimental_rank : existing.regimental_rank,
    regimental_score: body.regimental_score !== undefined ? body.regimental_score : existing.regimental_score,
    note: body.note !== undefined ? body.note?.trim() || null : existing.note,
  };

  await DB.prepare(
    `UPDATE banner_results SET entry_date = ?, make_number = ?, battalion_rank = ?, battalion_score = ?, regimental_rank = ?, regimental_score = ?, note = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(
      merged.entry_date,
      merged.make_number,
      merged.battalion_rank,
      merged.battalion_score,
      merged.regimental_rank,
      merged.regimental_score,
      merged.note,
      id,
    )
    .run();

  const row = await DB.prepare("SELECT * FROM banner_results WHERE id = ?").bind(id).first<BannerResultRow>();
  return c.json(serializeBannerResult(row!));
});

// DELETE /api/banners/:id
banners.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id FROM banner_results WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Banner result not found" }, 404);

  await DB.prepare("DELETE FROM banner_results WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});
