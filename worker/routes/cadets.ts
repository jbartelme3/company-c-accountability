import { Hono } from "hono";
import type { Env, CadetRow, MetricEntryRow, RankHistoryRow } from "../types";
import { serializeCadet, serializeMetricEntry, serializeRankHistory } from "../lib/serialize";
import {
  METRIC_TYPES,
  METRIC_POLARITY,
  POSITION_CLASS_YEARS,
  SECONDARY_POSITION_CLASS_YEARS,
  UNIT_TYPES,
  UNIT_ELIGIBILITY,
  UNIT_LEADER_COLUMN,
  LEADER_POSITION_FOR_UNIT,
  MAKE_NUMBERS,
  isClassYearEligibleForPosition,
  isClassYearEligibleForSecondaryPosition,
  rankAfterPositionChange,
  type UnitType,
} from "../lib/metrics";

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

function classYearError(classYear: string, position: string): string {
  const allowed = POSITION_CLASS_YEARS[position];
  const allowedText = allowed ? allowed.join("/") : "any class year";
  return `${classYear} cadets aren't eligible for ${position} (allowed: ${allowedText}).`;
}

function secondaryClassYearError(classYear: string, secondaryPosition: string): string {
  const allowed = SECONDARY_POSITION_CLASS_YEARS[secondaryPosition];
  const allowedText = allowed ? allowed.join("/") : "any class year";
  return `${classYear} cadets aren't eligible for ${secondaryPosition} (allowed: ${allowedText}).`;
}

// If a cadet's rank is (or is being set to) "New Cadet", they are always an
// Element — the New Cadet System doesn't have a rank-and-file cadet holding
// a leadership billet. This can override whatever position was requested.
function positionAfterRankChange(position: string, rank: string | null): string {
  return rank === "New Cadet" ? "Element" : position;
}

// Normalizes a requested team_leader_id/squad_leader_id/platoon_leader_id
// against this cadet's *final* position: not eligible -> null; the cadet
// holds the leader billet for this unit type -> always self (a leader is
// always their own unit, not user-editable); otherwise -> whatever was
// requested (falling back to the existing value), but only if it actually
// points at a cadet currently holding that unit's leader position — a stale
// or invalid reference is quietly dropped rather than erroring.
async function resolveLeaderId(
  DB: D1Database,
  unitType: UnitType,
  position: string,
  requested: number | null | undefined,
  existing: number | null,
  ownId: number | null,
): Promise<number | null> {
  if (!UNIT_ELIGIBILITY[unitType](position)) return null;
  if (position === LEADER_POSITION_FOR_UNIT[unitType]) return ownId;

  const candidate = requested !== undefined ? requested : existing;
  if (candidate == null || candidate === ownId) return null;

  const leader = await DB.prepare("SELECT position FROM cadets WHERE id = ?")
    .bind(candidate)
    .first<{ position: string }>();
  if (!leader || leader.position !== LEADER_POSITION_FOR_UNIT[unitType]) return null;

  return candidate;
}

// Small-unit assignment is a strict hierarchy: a cadet directly in a squad
// is always in that Squad Leader's own platoon, and a cadet on a team is
// always in that Team Leader's own squad *and* platoon — squad/platoon
// aren't independently chosen once a team/squad is picked, so every
// teammate/squadmate is guaranteed to match. Run after every write (POST,
// PATCH, and the position-change fallout each can trigger) so the whole
// table self-heals regardless of how many hops away the actual change was
// — e.g. a Squad Leader moving to a new Platoon needs to cascade down
// through every Team Leader in that squad to that team's own followers,
// which is exactly what running both passes in order does:
//   pass 1 fixes every direct squad member/Team Leader's platoon from their
//   squad, then pass 2 fixes every team follower's squad+platoon from their
//   (now-correct) Team Leader.
// The table is small (a single company's roster), so reconciling everyone
// on every save is simpler and more robust than precisely scoping a
// cascade to just the edited cadet's descendants.
async function reconcileUnitInheritance(DB: D1Database) {
  await DB.prepare(
    `UPDATE cadets
     SET platoon_leader_id = (SELECT sl.platoon_leader_id FROM cadets sl WHERE sl.id = cadets.squad_leader_id),
         updated_at = datetime('now')
     WHERE squad_leader_id IS NOT NULL
       AND squad_leader_id != id
       AND (team_leader_id IS NULL OR team_leader_id = id)
       AND platoon_leader_id IS NOT (SELECT sl.platoon_leader_id FROM cadets sl WHERE sl.id = cadets.squad_leader_id)`,
  ).run();

  await DB.prepare(
    `UPDATE cadets
     SET squad_leader_id = (SELECT tl.squad_leader_id FROM cadets tl WHERE tl.id = cadets.team_leader_id),
         platoon_leader_id = (SELECT tl.platoon_leader_id FROM cadets tl WHERE tl.id = cadets.team_leader_id),
         updated_at = datetime('now')
     WHERE team_leader_id IS NOT NULL
       AND team_leader_id != id
       AND (
         squad_leader_id IS NOT (SELECT tl.squad_leader_id FROM cadets tl WHERE tl.id = cadets.team_leader_id)
         OR platoon_leader_id IS NOT (SELECT tl.platoon_leader_id FROM cadets tl WHERE tl.id = cadets.team_leader_id)
       )`,
  ).run();
}

// After a cadet stops holding a unit's leader billet, everyone who was
// following them (including their own now-stale self-reference, already
// overwritten by the caller's UPDATE) falls out of that unit.
async function dissolveUnitIfLeaderChanged(DB: D1Database, oldPosition: string, newPosition: string, cadetId: number) {
  for (const unitType of UNIT_TYPES) {
    const leaderPosition = LEADER_POSITION_FOR_UNIT[unitType];
    if (oldPosition === leaderPosition && newPosition !== leaderPosition) {
      const column = UNIT_LEADER_COLUMN[unitType];
      await DB.prepare(`UPDATE cadets SET ${column} = NULL WHERE ${column} = ? AND id != ?`).bind(cadetId, cadetId).run();
    }
  }
}

interface UnitAssignmentBody {
  team_leader_id?: number | null;
  squad_leader_id?: number | null;
  platoon_leader_id?: number | null;
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

type CadetRowWithLeaderNames = CadetRow & {
  team_leader_first_name: string | null;
  team_leader_last_name: string | null;
  squad_leader_first_name: string | null;
  squad_leader_last_name: string | null;
  platoon_leader_first_name: string | null;
  platoon_leader_last_name: string | null;
};

// GET /api/cadets/:id
cadets.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const cadet = await DB.prepare(
    `SELECT c.*,
       tl.first_name AS team_leader_first_name, tl.last_name AS team_leader_last_name,
       sl.first_name AS squad_leader_first_name, sl.last_name AS squad_leader_last_name,
       pl.first_name AS platoon_leader_first_name, pl.last_name AS platoon_leader_last_name
     FROM cadets c
     LEFT JOIN cadets tl ON tl.id = c.team_leader_id
     LEFT JOIN cadets sl ON sl.id = c.squad_leader_id
     LEFT JOIN cadets pl ON pl.id = c.platoon_leader_id
     WHERE c.id = ?`,
  )
    .bind(id)
    .first<CadetRowWithLeaderNames>();
  if (!cadet) return c.json({ error: "Cadet not found" }, 404);

  const { results: entries } = await DB.prepare(
    "SELECT * FROM metric_entries WHERE cadet_id = ? ORDER BY entry_date DESC, id DESC",
  )
    .bind(id)
    .all<MetricEntryRow>();

  const { results: rankHistory } = await DB.prepare(
    "SELECT * FROM rank_history WHERE cadet_id = ? ORDER BY created_at DESC, id DESC",
  )
    .bind(id)
    .all<RankHistoryRow>();

  return c.json({
    ...serializeCadet(cadet),
    team_leader_name: cadet.team_leader_first_name ? `${cadet.team_leader_first_name} ${cadet.team_leader_last_name}` : null,
    squad_leader_name: cadet.squad_leader_first_name
      ? `${cadet.squad_leader_first_name} ${cadet.squad_leader_last_name}`
      : null,
    platoon_leader_name: cadet.platoon_leader_first_name
      ? `${cadet.platoon_leader_first_name} ${cadet.platoon_leader_last_name}`
      : null,
    metric_entries: entries.map(serializeMetricEntry),
    rank_history: rankHistory.map(serializeRankHistory),
  });
});

// POST /api/cadets
cadets.post("/", async (c) => {
  const body = await c.req.json<
    {
      first_name: string;
      last_name: string;
      position: string;
      rank?: string | null;
      class_year?: string | null;
      secondary_position?: string | null;
      room_number?: string | null;
    } & UnitAssignmentBody
  >();

  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return c.json({ error: "first_name and last_name are required" }, 400);
  }

  const { DB } = c.env;
  const requestedPosition = body.position?.trim() || "Element";
  const classYear = body.class_year?.trim() || null;
  const secondaryPosition = body.secondary_position?.trim() || null;
  const roomNumber = body.room_number?.trim() || null;

  if (classYear && !isClassYearEligibleForPosition(classYear, requestedPosition)) {
    return c.json({ error: classYearError(classYear, requestedPosition) }, 400);
  }
  if (classYear && secondaryPosition && !isClassYearEligibleForSecondaryPosition(classYear, secondaryPosition)) {
    return c.json({ error: secondaryClassYearError(classYear, secondaryPosition) }, 400);
  }

  // A newly-created cadet has no prior position, so their rank is simply
  // clamped to at least this position's minimum (see rankAfterPositionChange).
  const rank = rankAfterPositionChange(body.rank?.trim() || null, null, requestedPosition, classYear);
  const position = positionAfterRankChange(requestedPosition, rank);

  // team_leader_id/etc can't self-reference before the row exists (no id
  // yet) — a Team/Squad/Platoon Leader gets self-assigned in a follow-up
  // UPDATE right after insert. Whatever's requested here for
  // squad/platoon is only a starting point if this cadet turns out to be a
  // team/squad follower — reconcileUnitInheritance below corrects it.
  const teamLeaderId = await resolveLeaderId(DB, "team", position, body.team_leader_id, null, null);
  const squadLeaderId = await resolveLeaderId(DB, "squad", position, body.squad_leader_id, null, null);
  const platoonLeaderId = await resolveLeaderId(DB, "platoon", position, body.platoon_leader_id, null, null);

  const result = await DB.prepare(
    `INSERT INTO cadets (first_name, last_name, position, rank, class_year, secondary_position, team_leader_id, squad_leader_id, platoon_leader_id, room_number, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      body.first_name.trim(),
      body.last_name.trim(),
      position,
      rank,
      classYear,
      secondaryPosition,
      teamLeaderId,
      squadLeaderId,
      platoonLeaderId,
      roomNumber,
    )
    .run();

  const newId = result.meta.last_row_id;
  for (const unitType of UNIT_TYPES) {
    if (position === LEADER_POSITION_FOR_UNIT[unitType]) {
      const column = UNIT_LEADER_COLUMN[unitType];
      await DB.prepare(`UPDATE cadets SET ${column} = ? WHERE id = ?`).bind(newId, newId).run();
    }
  }

  await reconcileUnitInheritance(DB);

  const cadet = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(newId).first<CadetRow>();
  return c.json(serializeCadet(cadet!), 201);
});

// PATCH /api/cadets/:id
cadets.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(id).first<CadetRow>();
  if (!existing) return c.json({ error: "Cadet not found" }, 404);

  const body = await c.req.json<
    Partial<{
      first_name: string;
      last_name: string;
      position: string;
      rank: string | null;
      class_year: string | null;
      secondary_position: string | null;
      room_number: string | null;
      make_number: number | null;
      rank_change_note: string | null;
    }> &
      UnitAssignmentBody
  >();

  const requestedPosition = body.position?.trim() ?? existing.position;
  const classYear = body.class_year !== undefined ? body.class_year?.trim() || null : existing.class_year;
  const requestedRank = body.rank !== undefined ? body.rank?.trim() || null : existing.rank;
  const secondaryPosition =
    body.secondary_position !== undefined ? body.secondary_position?.trim() || null : existing.secondary_position;
  const roomNumber = body.room_number !== undefined ? body.room_number?.trim() || null : existing.room_number;

  if (body.make_number != null && !MAKE_NUMBERS.includes(body.make_number)) {
    return c.json({ error: `make_number must be one of: ${MAKE_NUMBERS.join(", ")}` }, 400);
  }

  // Class-year eligibility is checked against the position actually
  // requested by the caller — the "rank New Cadet forces Element" override
  // below is an automatic system rule, not a user choice, so it doesn't get
  // blocked by this check.
  if (classYear && !isClassYearEligibleForPosition(classYear, requestedPosition)) {
    return c.json({ error: classYearError(classYear, requestedPosition) }, 400);
  }
  if (classYear && secondaryPosition && !isClassYearEligibleForSecondaryPosition(classYear, secondaryPosition)) {
    return c.json({ error: secondaryClassYearError(classYear, secondaryPosition) }, 400);
  }

  // "Position makes the rank": moving to a position with a higher minimum
  // bumps rank up to match, but a move to a lower-minimum position never
  // demotes — the cadet keeps whatever rank they've already earned (except
  // for the acting-rank billets — see rankAfterPositionChange). This only
  // applies when position is actually changing; a rank-only edit (e.g. a
  // disciplinary reduction with no position change) is always respected as
  // given.
  const resolvedRank =
    requestedPosition !== existing.position
      ? rankAfterPositionChange(requestedRank, existing.position, requestedPosition, classYear)
      : requestedRank;

  // A rank edit that lands on "New Cadet" (whether via a direct rank change,
  // or because the position change above landed there) always forces
  // position back to Element.
  const position = positionAfterRankChange(requestedPosition, resolvedRank);

  const merged = {
    first_name: body.first_name?.trim() ?? existing.first_name,
    last_name: body.last_name?.trim() ?? existing.last_name,
    position,
    rank: resolvedRank,
    class_year: classYear,
    secondary_position: secondaryPosition,
    room_number: roomNumber,
  };

  // Whatever's requested here for squad/platoon is only a starting point if
  // this cadet turns out to be a team/squad follower — reconcileUnitInheritance
  // below corrects it (and cascades to anyone downstream of this cadet too).
  const teamLeaderId = await resolveLeaderId(DB, "team", position, body.team_leader_id, existing.team_leader_id, id);
  const squadLeaderId = await resolveLeaderId(DB, "squad", position, body.squad_leader_id, existing.squad_leader_id, id);
  const platoonLeaderId = await resolveLeaderId(
    DB,
    "platoon",
    position,
    body.platoon_leader_id,
    existing.platoon_leader_id,
    id,
  );

  await DB.prepare(
    `UPDATE cadets SET first_name = ?, last_name = ?, position = ?, rank = ?, class_year = ?, secondary_position = ?, team_leader_id = ?, squad_leader_id = ?, platoon_leader_id = ?, room_number = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(
      merged.first_name,
      merged.last_name,
      merged.position,
      merged.rank,
      merged.class_year,
      merged.secondary_position,
      teamLeaderId,
      squadLeaderId,
      platoonLeaderId,
      merged.room_number,
      id,
    )
    .run();

  await dissolveUnitIfLeaderChanged(DB, existing.position, position, id);
  await reconcileUnitInheritance(DB);

  // Every actual rank transition gets archived — whether from a direct rank
  // edit or a position change bumping the rank floor — so "what rank were
  // they during Make 2" stays answerable later. make_number is optional:
  // only meaningful when this edit is cadre recording a specific make's
  // promotion, but the history entry is written either way.
  if (merged.rank !== existing.rank) {
    await DB.prepare(
      `INSERT INTO rank_history (cadet_id, make_number, previous_rank, new_rank, note)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(id, body.make_number ?? null, existing.rank, merged.rank, body.rank_change_note?.trim() || null)
      .run();
  }

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
