import { Hono } from "hono";
import type { CadetRow, Env, UnitAwardRow } from "../types";
import { serializeUnitAward } from "../lib/serialize";
import { UNIT_TYPES, LEADER_POSITION_FOR_UNIT, type UnitType } from "../lib/metrics";

export const unitAwards = new Hono<{ Bindings: Env }>();

type RowWithLeader = UnitAwardRow & { leader_first_name: string; leader_last_name: string };

const SELECT_WITH_LEADER = `
  SELECT a.*, c.first_name AS leader_first_name, c.last_name AS leader_last_name
  FROM unit_of_week_awards a
  JOIN cadets c ON c.id = a.leader_cadet_id
`;

function isUnitType(value: string): value is UnitType {
  return (UNIT_TYPES as string[]).includes(value);
}

// GET /api/unit-awards?type=team
unitAwards.get("/", async (c) => {
  const type = c.req.query("type");
  if (type && !isUnitType(type)) {
    return c.json({ error: `type must be one of: ${UNIT_TYPES.join(", ")}` }, 400);
  }

  const { DB } = c.env;
  const where = type ? "WHERE a.unit_type = ?" : "";
  const stmt = type
    ? DB.prepare(`${SELECT_WITH_LEADER} ${where} ORDER BY a.entry_date DESC, a.id DESC`).bind(type)
    : DB.prepare(`${SELECT_WITH_LEADER} ORDER BY a.entry_date DESC, a.id DESC`);

  const { results } = await stmt.all<RowWithLeader>();
  return c.json(results.map(serializeUnitAward));
});

// POST /api/unit-awards
unitAwards.post("/", async (c) => {
  const body = await c.req.json<{
    entry_date: string;
    unit_type: string;
    leader_cadet_id: number;
    note?: string | null;
  }>();

  if (!body.entry_date?.trim()) {
    return c.json({ error: "entry_date is required" }, 400);
  }
  if (!isUnitType(body.unit_type)) {
    return c.json({ error: `unit_type must be one of: ${UNIT_TYPES.join(", ")}` }, 400);
  }
  if (!body.leader_cadet_id) {
    return c.json({ error: "leader_cadet_id is required" }, 400);
  }

  const { DB } = c.env;
  const leader = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(body.leader_cadet_id).first<CadetRow>();
  if (!leader) return c.json({ error: "leader_cadet_id does not match a cadet" }, 400);
  if (leader.position !== LEADER_POSITION_FOR_UNIT[body.unit_type]) {
    return c.json(
      { error: `${leader.first_name} ${leader.last_name} doesn't currently hold ${LEADER_POSITION_FOR_UNIT[body.unit_type]}.` },
      400,
    );
  }

  const result = await DB.prepare(
    `INSERT INTO unit_of_week_awards (entry_date, unit_type, leader_cadet_id, note, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  )
    .bind(body.entry_date.trim(), body.unit_type, body.leader_cadet_id, body.note?.trim() || null)
    .run();

  const row = await DB.prepare(`${SELECT_WITH_LEADER} WHERE a.id = ?`).bind(result.meta.last_row_id).first<RowWithLeader>();
  return c.json(serializeUnitAward(row!), 201);
});

// PATCH /api/unit-awards/:id
unitAwards.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT * FROM unit_of_week_awards WHERE id = ?").bind(id).first<UnitAwardRow>();
  if (!existing) return c.json({ error: "Award not found" }, 404);

  const body = await c.req.json<Partial<{ entry_date: string; leader_cadet_id: number; note: string | null }>>();

  let leaderCadetId = existing.leader_cadet_id;
  if (body.leader_cadet_id !== undefined) {
    const leader = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(body.leader_cadet_id).first<CadetRow>();
    if (!leader) return c.json({ error: "leader_cadet_id does not match a cadet" }, 400);
    if (leader.position !== LEADER_POSITION_FOR_UNIT[existing.unit_type as UnitType]) {
      return c.json(
        {
          error: `${leader.first_name} ${leader.last_name} doesn't currently hold ${LEADER_POSITION_FOR_UNIT[existing.unit_type as UnitType]}.`,
        },
        400,
      );
    }
    leaderCadetId = body.leader_cadet_id;
  }

  const merged = {
    entry_date: body.entry_date?.trim() ?? existing.entry_date,
    leader_cadet_id: leaderCadetId,
    note: body.note !== undefined ? body.note?.trim() || null : existing.note,
  };

  await DB.prepare(
    `UPDATE unit_of_week_awards SET entry_date = ?, leader_cadet_id = ?, note = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(merged.entry_date, merged.leader_cadet_id, merged.note, id)
    .run();

  const row = await DB.prepare(`${SELECT_WITH_LEADER} WHERE a.id = ?`).bind(id).first<RowWithLeader>();
  return c.json(serializeUnitAward(row!));
});

// DELETE /api/unit-awards/:id
unitAwards.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id FROM unit_of_week_awards WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Award not found" }, 404);

  await DB.prepare("DELETE FROM unit_of_week_awards WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});
