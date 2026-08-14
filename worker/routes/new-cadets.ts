import { Hono } from "hono";
import type { CadetRow, Env } from "../types";
import { serializeCadet } from "../lib/serialize";

export const newCadets = new Hono<{ Bindings: Env }>();

type CadetRowWithGigCount = CadetRow & { lineup_gig_count: number };

// GET /api/new-cadets — every cadet currently holding the New Cadet rank,
// ranked by New Cadet Lineup Gig count (fewest first, same "lowest wins"
// convention as the Military Banner). A cadet stops appearing here the
// moment they're promoted past New Cadet rank — that promotion is what
// "passing" the New Cadet System means.
newCadets.get("/", async (c) => {
  const { DB } = c.env;
  const { results } = await DB.prepare(
    `SELECT c.*, (
       SELECT COUNT(*) FROM metric_entries m
       WHERE m.cadet_id = c.id AND m.type = 'new_cadet_lineup_gig'
     ) AS lineup_gig_count
     FROM cadets c
     WHERE c.rank = 'New Cadet'
     ORDER BY lineup_gig_count ASC, c.last_name COLLATE NOCASE, c.first_name COLLATE NOCASE`,
  ).all<CadetRowWithGigCount>();

  return c.json(results.map((row) => ({ ...serializeCadet(row), lineup_gig_count: row.lineup_gig_count })));
});
