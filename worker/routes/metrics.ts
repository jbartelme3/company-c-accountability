import { Hono } from "hono";
import type { Env, CadetRow, MetricEntryRow } from "../types";
import {
  LAUNDRY_TYPES,
  LINEUP_GIG_TYPES,
  METRIC_TYPES,
  OFFENSE_TYPES,
  isEligibleForNewCadetLineupGig,
  isRoomPairedMetric,
  type LaundryType,
  type LineupGigType,
  type MetricType,
  type OffenseType,
} from "../lib/metrics";
import { serializeMetricEntry } from "../lib/serialize";

const MAX_QUANTITY = 20;

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

// Reasoning note for a dc/work_detail entry auto-logged from an Offense
// (see is_dc/is_work_detail below) — same wording whether it's created on
// POST or kept in sync on PATCH.
function offenseAutoNote(offenseType: string | null | undefined, offenseDetail: string | null | undefined, note: string | null | undefined): string {
  const reason = offenseType && offenseDetail ? `${offenseType} — ${offenseDetail}` : "an Offense";
  return note ? `Auto-logged from Offense (${reason}): ${note}` : `Auto-logged from Offense (${reason})`;
}

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
    lineup_gig_type?: LineupGigType | null;
    offense_type?: OffenseType | null;
    offense_detail?: string | null;
    is_dc?: boolean | null;
    is_work_detail?: boolean | null;
    quantity?: number;
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
  if (body.type === "new_cadet_lineup_gig" && !LINEUP_GIG_TYPES.includes(body.lineup_gig_type as LineupGigType)) {
    return c.json(
      { error: `lineup_gig_type is required for a New Cadet Lineup Gig and must be one of: ${LINEUP_GIG_TYPES.join(", ")}` },
      400,
    );
  }
  if (body.type === "offense") {
    if (!OFFENSE_TYPES.includes(body.offense_type as OffenseType)) {
      return c.json({ error: `offense_type is required for an Offense and must be one of: ${OFFENSE_TYPES.join(", ")}` }, 400);
    }
    if (!body.offense_detail?.trim()) {
      return c.json({ error: "offense_detail is required for an Offense" }, 400);
    }
    if (typeof body.is_dc !== "boolean" || typeof body.is_work_detail !== "boolean") {
      return c.json({ error: "is_dc and is_work_detail (true/false) are required for an Offense" }, 400);
    }
  }

  const quantity = body.quantity != null ? Math.trunc(body.quantity) : 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return c.json({ error: `quantity must be an integer between 1 and ${MAX_QUANTITY}` }, 400);
  }

  const { DB } = c.env;
  const cadet = await DB.prepare("SELECT * FROM cadets WHERE id = ?").bind(body.cadet_id).first<CadetRow>();
  if (!cadet) return c.json({ error: "Cadet not found" }, 404);

  if (body.type === "new_cadet_lineup_gig" && !isEligibleForNewCadetLineupGig(cadet)) {
    return c.json(
      { error: "New Cadet Lineup Gigs only apply to cadets currently holding the New Cadet rank." },
      400,
    );
  }

  const entryDate = body.entry_date?.trim() || new Date().toISOString().slice(0, 10);
  const laundryType = body.type === "laundry_gig" ? body.laundry_type : null;
  const lineupGigType = body.type === "new_cadet_lineup_gig" ? body.lineup_gig_type : null;
  const offenseType = body.type === "offense" ? body.offense_type : null;
  const offenseDetail = body.type === "offense" ? body.offense_detail!.trim() : null;
  const isDc = body.type === "offense" ? (body.is_dc ? 1 : 0) : null;
  const isWorkDetail = body.type === "offense" ? (body.is_work_detail ? 1 : 0) : null;
  const note = body.note?.trim() || null;

  // Bulk-add: each unit ("how many gigs") is still its own dated row, just
  // inserted together in one batch rather than one request per gig.
  const insertStmt = DB.prepare(
    `INSERT INTO metric_entries (cadet_id, type, laundry_type, lineup_gig_type, offense_type, offense_detail, is_dc, is_work_detail, entry_date, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  );
  const batchResults = await DB.batch(
    Array.from({ length: quantity }, () =>
      insertStmt.bind(body.cadet_id, body.type, laundryType, lineupGigType, offenseType, offenseDetail, isDc, isWorkDetail, entryDate, note),
    ),
  );
  let ids = batchResults.map((r) => r.meta.last_row_id);

  // Checking "DC?" and/or "Work Detail?" on an Offense also auto-logs a
  // matching dc/work_detail entry per offense unit — same cadet and date,
  // with a note explaining where it came from. source_offense_id links each
  // one back to the offense entry that created it, so PATCH/DELETE below can
  // keep it in sync.
  if (body.type === "offense" && (body.is_dc || body.is_work_detail)) {
    const autoNote = offenseAutoNote(offenseType, offenseDetail, note);
    const autoInsertStmt = DB.prepare(
      `INSERT INTO metric_entries (cadet_id, type, entry_date, note, source_offense_id, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    );
    const autoStatements = ids.flatMap((offenseId) => {
      const stmts = [];
      if (body.is_dc) stmts.push(autoInsertStmt.bind(body.cadet_id, "dc", entryDate, autoNote, offenseId));
      if (body.is_work_detail) stmts.push(autoInsertStmt.bind(body.cadet_id, "work_detail", entryDate, autoNote, offenseId));
      return stmts;
    });
    const autoResults = await DB.batch(autoStatements);
    ids = [...ids, ...autoResults.map((r) => r.meta.last_row_id)];
  }

  // Room Inspection gigs auto-clone to every roommate — "if one roommate
  // gets a room gig, they both do." One room_gig_group_id per unit of
  // quantity, so PATCH/DELETE below can keep each instance's clones in
  // lockstep without accidentally touching a different day's entries.
  if (isRoomPairedMetric(body.type) && cadet.room_number) {
    const { results: roommates } = await DB.prepare("SELECT id FROM cadets WHERE room_number = ? AND id != ?")
      .bind(cadet.room_number, body.cadet_id)
      .all<{ id: number }>();

    if (roommates.length > 0) {
      const groupIds = ids.map(() => crypto.randomUUID());
      const statements = [
        ...ids.map((entryId, i) =>
          DB.prepare("UPDATE metric_entries SET room_gig_group_id = ? WHERE id = ?").bind(groupIds[i], entryId),
        ),
        ...roommates.flatMap((roommate) =>
          groupIds.map((groupId) =>
            DB.prepare(
              `INSERT INTO metric_entries (cadet_id, type, laundry_type, lineup_gig_type, room_gig_group_id, entry_date, note, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            ).bind(roommate.id, body.type, laundryType, lineupGigType, groupId, entryDate, note),
          ),
        ),
      ];
      const roommateResults = await DB.batch(statements);
      // Only the INSERTs (everything after the ids.length UPDATEs at the front) produce a new row id.
      const newIds = roommateResults.slice(ids.length).map((r) => r.meta.last_row_id);
      ids = [...ids, ...newIds];
    }
  }

  const { results: rows } = await DB.prepare(
    `${SELECT_WITH_CADET} WHERE m.id IN (${ids.map(() => "?").join(", ")}) ORDER BY m.id ASC`,
  )
    .bind(...ids)
    .all<RowWithCadet>();

  return c.json(rows.map(serializeWithCadet), 201);
});

// PATCH /api/metrics/:id
metrics.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT * FROM metric_entries WHERE id = ?").bind(id).first<MetricEntryRow>();
  if (!existing) return c.json({ error: "Metric entry not found" }, 404);

  const body = await c.req.json<
    Partial<{
      entry_date: string;
      note: string | null;
      laundry_type: LaundryType | null;
      lineup_gig_type: LineupGigType | null;
      offense_type: OffenseType | null;
      offense_detail: string | null;
      is_dc: boolean | null;
      is_work_detail: boolean | null;
    }>
  >();

  if (existing.type === "laundry_gig" && body.laundry_type !== undefined && !LAUNDRY_TYPES.includes(body.laundry_type as LaundryType)) {
    return c.json({ error: `laundry_type must be one of: ${LAUNDRY_TYPES.join(", ")}` }, 400);
  }
  if (
    existing.type === "new_cadet_lineup_gig" &&
    body.lineup_gig_type !== undefined &&
    !LINEUP_GIG_TYPES.includes(body.lineup_gig_type as LineupGigType)
  ) {
    return c.json({ error: `lineup_gig_type must be one of: ${LINEUP_GIG_TYPES.join(", ")}` }, 400);
  }
  if (existing.type === "offense" && body.offense_type !== undefined && !OFFENSE_TYPES.includes(body.offense_type as OffenseType)) {
    return c.json({ error: `offense_type must be one of: ${OFFENSE_TYPES.join(", ")}` }, 400);
  }
  if (existing.type === "offense" && body.offense_detail !== undefined && !body.offense_detail?.trim()) {
    return c.json({ error: "offense_detail can't be blank" }, 400);
  }

  const merged = {
    entry_date: body.entry_date?.trim() ?? existing.entry_date,
    note: body.note !== undefined ? body.note?.trim() || null : existing.note,
    laundry_type: existing.type === "laundry_gig" ? (body.laundry_type ?? existing.laundry_type) : existing.laundry_type,
    lineup_gig_type:
      existing.type === "new_cadet_lineup_gig" ? (body.lineup_gig_type ?? existing.lineup_gig_type) : existing.lineup_gig_type,
    offense_type: existing.type === "offense" ? (body.offense_type ?? existing.offense_type) : existing.offense_type,
    offense_detail:
      existing.type === "offense" ? (body.offense_detail?.trim() ?? existing.offense_detail) : existing.offense_detail,
    is_dc: existing.type === "offense" ? (body.is_dc !== undefined ? (body.is_dc ? 1 : 0) : existing.is_dc) : existing.is_dc,
    is_work_detail:
      existing.type === "offense"
        ? body.is_work_detail !== undefined
          ? body.is_work_detail
            ? 1
            : 0
          : existing.is_work_detail
        : existing.is_work_detail,
  };

  await DB.prepare(
    "UPDATE metric_entries SET entry_date = ?, note = ?, laundry_type = ?, lineup_gig_type = ?, offense_type = ?, offense_detail = ?, is_dc = ?, is_work_detail = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(
      merged.entry_date,
      merged.note,
      merged.laundry_type,
      merged.lineup_gig_type,
      merged.offense_type,
      merged.offense_detail,
      merged.is_dc,
      merged.is_work_detail,
      id,
    )
    .run();

  // Keep this entry's roommate clones (same room_gig_group_id) in sync —
  // laundry_type/lineup_gig_type don't apply to Room Inspection gigs, so
  // only date/note ever need to propagate.
  if (existing.room_gig_group_id) {
    await DB.prepare("UPDATE metric_entries SET entry_date = ?, note = ?, updated_at = datetime('now') WHERE room_gig_group_id = ? AND id != ?")
      .bind(merged.entry_date, merged.note, existing.room_gig_group_id, id)
      .run();
  }

  // Keep this offense's auto-logged dc/work_detail entries (source_offense_id)
  // in sync: flip is_dc/is_work_detail on and one gets created if missing,
  // flip it off and the existing one is removed, and either way an existing
  // one's date/reasoning is kept current with this edit.
  if (existing.type === "offense") {
    const { results: children } = await DB.prepare("SELECT id, type FROM metric_entries WHERE source_offense_id = ?")
      .bind(id)
      .all<{ id: number; type: string }>();

    const autoNote = offenseAutoNote(merged.offense_type, merged.offense_detail, merged.note);
    const desired: { childType: "dc" | "work_detail"; want: boolean }[] = [
      { childType: "dc", want: merged.is_dc === 1 },
      { childType: "work_detail", want: merged.is_work_detail === 1 },
    ];

    const statements: ReturnType<typeof DB.prepare>[] = [];
    for (const { childType, want } of desired) {
      const child = children.find((c) => c.type === childType);
      if (want && !child) {
        statements.push(
          DB.prepare(
            `INSERT INTO metric_entries (cadet_id, type, entry_date, note, source_offense_id, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          ).bind(existing.cadet_id, childType, merged.entry_date, autoNote, id),
        );
      } else if (want && child) {
        statements.push(
          DB.prepare("UPDATE metric_entries SET entry_date = ?, note = ?, updated_at = datetime('now') WHERE id = ?").bind(
            merged.entry_date,
            autoNote,
            child.id,
          ),
        );
      } else if (!want && child) {
        statements.push(DB.prepare("DELETE FROM metric_entries WHERE id = ?").bind(child.id));
      }
    }
    if (statements.length > 0) await DB.batch(statements);
  }

  const row = await DB.prepare(`${SELECT_WITH_CADET} WHERE m.id = ?`).bind(id).first<RowWithCadet>();
  return c.json(serializeWithCadet(row!));
});

// DELETE /api/metrics/:id
metrics.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id, room_gig_group_id FROM metric_entries WHERE id = ?")
    .bind(id)
    .first<{ id: number; room_gig_group_id: string | null }>();
  if (!existing) return c.json({ error: "Metric entry not found" }, 404);

  // Removing one roommate's side of a joint Room Inspection gig removes the
  // whole thing — "if one roommate gets a room gig, they both do" cuts both
  // ways, so it never drifts out of sync.
  if (existing.room_gig_group_id) {
    await DB.prepare("DELETE FROM metric_entries WHERE room_gig_group_id = ?").bind(existing.room_gig_group_id).run();
  } else {
    // Deleting an Offense also removes any dc/work_detail entries it
    // auto-logged (source_offense_id) — deleting one of those entries
    // directly only removes itself.
    await DB.prepare("DELETE FROM metric_entries WHERE id = ? OR source_offense_id = ?").bind(id, id).run();
  }
  return c.body(null, 204);
});
