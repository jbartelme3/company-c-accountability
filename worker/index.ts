import { Hono } from "hono";
import type { Env } from "./types";
import { clearSessionCookie, createSessionCookie, isAuthenticated } from "./auth";
import { getClientIp, isLocked, recordFailedAttempt, resendCode, resetLockout, verifyCode } from "./lib/loginSecurity";
import { cadets } from "./routes/cadets";
import { metrics } from "./routes/metrics";
import { banners } from "./routes/banners";
import { units } from "./routes/units";
import { unitAwards } from "./routes/unit-awards";
import { newCadets } from "./routes/new-cadets";
import { rankHistory } from "./routes/rank-history";
import { conductGigReports } from "./routes/conduct-gig-reports";
import { makePeriods } from "./routes/make-periods";

const app = new Hono<{ Bindings: Env }>();

app.post("/api/login", async (c) => {
  const ip = getClientIp(c.req.raw);

  if (await isLocked(c.env.DB, ip)) {
    return c.json({ error: "Too many failed attempts. Check the admin's email for a verification code.", locked: true }, 423);
  }

  const body = await c.req.json<{ password?: string }>().catch(() => ({ password: undefined }));

  if (!body.password || body.password !== c.env.SITE_PASSWORD) {
    const result = await recordFailedAttempt(c.env, ip);
    if (result.locked) {
      return c.json(
        { error: "Too many failed attempts. We've sent a verification code to the admin's email.", locked: true },
        423,
      );
    }
    return c.json({ error: "Incorrect password", remainingAttempts: result.remainingAttempts }, 401);
  }

  await resetLockout(c.env.DB, ip);
  c.header("Set-Cookie", await createSessionCookie(c.env));
  return c.json({ ok: true });
});

app.post("/api/login/verify", async (c) => {
  const ip = getClientIp(c.req.raw);
  const body = await c.req.json<{ code?: string }>().catch(() => ({ code: undefined }));
  if (!body.code) return c.json({ error: "Code is required" }, 400);

  const result = await verifyCode(c.env.DB, ip, body.code);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

app.post("/api/login/resend-code", async (c) => {
  const ip = getClientIp(c.req.raw);
  const result = await resendCode(c.env, ip);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

app.post("/api/logout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.json({ ok: true });
});

// Public webhook: not session-protected (an external Power Automate flow
// can't hold a cookie), gated on a shared secret instead. Registered ahead
// of the /api/* session middleware below, same as the login endpoints.
// Intended for a Microsoft Forms -> Power Automate -> HTTP POST bridge that
// cadre sets up separately (see README instructions) — this app has no
// direct Microsoft Forms integration of its own.
app.post("/api/webhooks/conduct-gig-report", async (c) => {
  const secret = c.req.query("secret") ?? c.req.header("x-webhook-secret");
  if (!secret || secret !== c.env.CONDUCT_REPORT_WEBHOOK_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req
    .json<{ reporter_name?: string; cadet_name?: string; entry_date?: string; reasoning?: string }>()
    .catch(() => ({}) as Record<string, never>);

  if (!body.reporter_name?.trim()) return c.json({ error: "reporter_name is required" }, 400);
  if (!body.cadet_name?.trim()) return c.json({ error: "cadet_name is required" }, 400);
  if (!body.reasoning?.trim()) return c.json({ error: "reasoning is required" }, 400);

  const { DB } = c.env;
  // A free-text Microsoft Forms answer is never as clean as a form built
  // against this schema directly — collapse "Last,First" (no space after
  // the comma) and doubled-up spaces down to the single-space forms the SQL
  // patterns below expect, rather than 404ing on what's obviously the same name.
  const needle = body.cadet_name.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
  let { results: candidates } = await DB.prepare(
    `SELECT id FROM cadets
     WHERE lower(first_name || ' ' || last_name) = ?
        OR lower(last_name || ' ' || first_name) = ?
        OR lower(last_name || ', ' || first_name) = ?`,
  )
    .bind(needle, needle, needle)
    .all<{ id: number }>();

  // Fall back to a first-name-only or last-name-only match (e.g. a reporter
  // who only typed "Casey") — still safe, the ambiguity check right below
  // catches anything that matches more than one cadet.
  if (candidates.length === 0) {
    ({ results: candidates } = await DB.prepare("SELECT id FROM cadets WHERE lower(first_name) = ? OR lower(last_name) = ?")
      .bind(needle, needle)
      .all<{ id: number }>());
  }

  if (candidates.length === 0) {
    return c.json({ error: `No cadet found matching "${body.cadet_name}".` }, 404);
  }
  if (candidates.length > 1) {
    return c.json({ error: `Multiple cadets match "${body.cadet_name}" — log this one manually instead.` }, 409);
  }

  const entryDate = body.entry_date?.trim() || new Date().toISOString().slice(0, 10);

  await DB.prepare(
    `INSERT INTO conduct_gig_reports (reporter_name, cadet_id, entry_date, reasoning, source) VALUES (?, ?, ?, ?, 'form')`,
  )
    .bind(body.reporter_name.trim(), candidates[0].id, entryDate, body.reasoning.trim())
    .run();

  return c.json({ ok: true }, 201);
});

app.get("/api/me", async (c) => {
  const authed = await isAuthenticated(c.req.raw, c.env);
  if (!authed) return c.json({ authenticated: false }, 401);
  return c.json({ authenticated: true });
});

// Everything else under /api requires a valid session.
app.use("/api/*", async (c, next) => {
  const authed = await isAuthenticated(c.req.raw, c.env);
  if (!authed) return c.json({ error: "Unauthorized" }, 401);
  await next();
});

app.route("/api/cadets", cadets);
app.route("/api/metrics", metrics);
app.route("/api/banners", banners);
app.route("/api/units", units);
app.route("/api/unit-awards", unitAwards);
app.route("/api/new-cadets", newCadets);
app.route("/api/rank-history", rankHistory);
app.route("/api/conduct-gig-reports", conductGigReports);
app.route("/api/make-periods", makePeriods);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
