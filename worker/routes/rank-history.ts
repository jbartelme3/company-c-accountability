import { Hono } from "hono";
import type { Env } from "../types";

export const rankHistory = new Hono<{ Bindings: Env }>();

// DELETE /api/rank-history/:id — entries are otherwise auto-logged by
// PATCH /api/cadets/:id (see worker/routes/cadets.ts); this only exists to
// correct a mistaken entry (wrong make number, etc).
rankHistory.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id FROM rank_history WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Rank history entry not found" }, 404);

  await DB.prepare("DELETE FROM rank_history WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});
