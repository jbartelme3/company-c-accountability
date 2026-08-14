import { Hono } from "hono";
import type { CadetRow, ConductGigReportRow, Env } from "../types";
import { serializeConductGigReport } from "../lib/serialize";

export const conductGigReports = new Hono<{ Bindings: Env }>();

type RowWithCadetName = ConductGigReportRow & { cadet_first_name: string; cadet_last_name: string };

const SELECT_WITH_CADET = `
  SELECT r.*, c.first_name AS cadet_first_name, c.last_name AS cadet_last_name
  FROM conduct_gig_reports r
  JOIN cadets c ON c.id = r.cadet_id
`;

// GET /api/conduct-gig-reports — ordered by recency of submission
// (created_at), not the incident date, per the spec.
conductGigReports.get("/", async (c) => {
  const { DB } = c.env;
  const { results } = await DB.prepare(`${SELECT_WITH_CADET} ORDER BY r.created_at DESC, r.id DESC`).all<RowWithCadetName>();
  return c.json(results.map(serializeConductGigReport));
});

// POST /api/conduct-gig-reports — manual entry by cadre. Automated
// submissions from a Microsoft Forms/Power Automate bridge come in through
// POST /api/webhooks/conduct-gig-report instead (see worker/index.ts).
conductGigReports.post("/", async (c) => {
  const body = await c.req.json<{
    reporter_name: string;
    cadet_id: number;
    entry_date: string;
    reasoning: string;
  }>();

  if (!body.reporter_name?.trim()) return c.json({ error: "reporter_name is required" }, 400);
  if (!body.cadet_id) return c.json({ error: "cadet_id is required" }, 400);
  if (!body.entry_date?.trim()) return c.json({ error: "entry_date is required" }, 400);
  if (!body.reasoning?.trim()) return c.json({ error: "reasoning is required" }, 400);

  const { DB } = c.env;
  const cadet = await DB.prepare("SELECT id FROM cadets WHERE id = ?").bind(body.cadet_id).first<CadetRow>();
  if (!cadet) return c.json({ error: "Cadet not found" }, 404);

  const result = await DB.prepare(
    `INSERT INTO conduct_gig_reports (reporter_name, cadet_id, entry_date, reasoning, source)
     VALUES (?, ?, ?, ?, 'manual')`,
  )
    .bind(body.reporter_name.trim(), body.cadet_id, body.entry_date.trim(), body.reasoning.trim())
    .run();

  const row = await DB.prepare(`${SELECT_WITH_CADET} WHERE r.id = ?`).bind(result.meta.last_row_id).first<RowWithCadetName>();
  return c.json(serializeConductGigReport(row!), 201);
});

// DELETE /api/conduct-gig-reports/:id
conductGigReports.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { DB } = c.env;

  const existing = await DB.prepare("SELECT id FROM conduct_gig_reports WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Report not found" }, 404);

  await DB.prepare("DELETE FROM conduct_gig_reports WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});
