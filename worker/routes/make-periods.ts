import { Hono } from "hono";
import type { Env, MakePeriodRow } from "../types";
import { serializeMakePeriod } from "../lib/serialize";
import { MAKE_NUMBERS } from "../lib/metrics";

export const makePeriods = new Hono<{ Bindings: Env }>();

// GET /api/make-periods — every make (1-3) cadre has configured a date range
// for. A make with no row yet just doesn't appear (frontend treats it as
// "not configured").
makePeriods.get("/", async (c) => {
  const { DB } = c.env;
  const { results } = await DB.prepare("SELECT * FROM make_periods ORDER BY make_number").all<MakePeriodRow>();
  return c.json(results.map(serializeMakePeriod));
});

// PUT /api/make-periods/:number — upsert the start/end date for make 1/2/3.
// Used to auto-bucket gig totals into Team/Squad/Platoon of the Make
// standings (see frontend/src/lib/periods.ts).
makePeriods.put("/:number", async (c) => {
  const makeNumber = Number(c.req.param("number"));
  if (!MAKE_NUMBERS.includes(makeNumber)) {
    return c.json({ error: `make_number must be one of: ${MAKE_NUMBERS.join(", ")}` }, 400);
  }

  const body = await c.req.json<{ start_date?: string; end_date?: string }>();
  const startDate = body.start_date?.trim();
  const endDate = body.end_date?.trim();
  if (!startDate || !endDate) {
    return c.json({ error: "start_date and end_date are required" }, 400);
  }
  if (startDate > endDate) {
    return c.json({ error: "start_date must be on or before end_date" }, 400);
  }

  const { DB } = c.env;
  await DB.prepare(
    `INSERT INTO make_periods (make_number, start_date, end_date, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(make_number) DO UPDATE SET start_date = excluded.start_date, end_date = excluded.end_date, updated_at = datetime('now')`,
  )
    .bind(makeNumber, startDate, endDate)
    .run();

  const row = await DB.prepare("SELECT * FROM make_periods WHERE make_number = ?").bind(makeNumber).first<MakePeriodRow>();
  return c.json(serializeMakePeriod(row!));
});
