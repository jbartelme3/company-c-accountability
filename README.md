# Company C Accountability

An accountability web app built for Company C at Culver Military Academy.

## Problem

Company C's Cadre had no centralized way to track cadet accountability —
gigs, Eagle Pride Reports, inspections, laundry, work details, and
absences were scattered across paper and memory, making it hard to see
any one cadet's full record or hold the unit accountable consistently.

## Solution

A password-protected app, restricted to Cadre (Commissioned Officers,
Unit Commander, Executive Officer, Operations Sergeant, First Sergeant),
built around a single roster of every cadet in Company C. Selecting a
cadet surfaces their complete record in one place:

- New Cadet lineup gigs
- In-unit haircut list
- Battalion and Regimental inspection gigs
- Positive and negative Eagle Pride Reports (EPRs)
- Laundry gigs (mixed laundry, dry cleaning)
- Work details, DCs, and absences

Each metric is tracked individually per cadet, and rank/position updates
each make cycle.

## Tech stack

React · Hono · Cloudflare Workers · D1 (SQLite) · Tailwind CSS

## Live

https://company-c-accountability.jbartelme3.workers.dev — password-protected,
access limited to Company C Cadre.

## Conduct Gig Report form bridge

New Cadets can be reported for a conduct gig without cadre needing to log in,
via a Microsoft Form → Power Automate → webhook bridge. This app has no
Microsoft Forms integration of its own — the Form and the Power Automate flow
that submits it both live in Microsoft 365, set up separately from this repo.

**Setting up (or fixing) the Power Automate flow:**

1. The Form needs 3 free-text questions whose *answers* map to these JSON keys
   (question wording can be anything — Power Automate maps by which question,
   not by text):
   - `reporter_name` — who's filing the report
   - `cadet_name` — the New Cadet being reported (any of "First Last",
     "Last, First", or just a first or last name works — matching is
     case-insensitive and tolerates extra/missing spaces around a comma; it
     fails with a clear error rather than guessing if more than one cadet
     shares that name)
   - `reasoning` — why
   - optionally `entry_date` (`YYYY-MM-DD`) — defaults to today if omitted
2. In Power Automate, add an **HTTP** action (When a new response is
   submitted → Get response details → HTTP):
   - Method: `POST`
   - URI: `https://company-c-accountability.jbartelme3.workers.dev/api/webhooks/conduct-gig-report?secret=<CONDUCT_REPORT_WEBHOOK_SECRET>`
   - Headers: `Content-Type: application/json` — **this has to be JSON, not
     the default form-encoded body**, or every submission will silently fail
     with a generic 400
   - Body: `{"reporter_name": "...", "cadet_name": "...", "reasoning": "...", "entry_date": "..."}`
     built from the form's answer values
3. The secret is a Worker secret (`wrangler secret put CONDUCT_REPORT_WEBHOOK_SECRET`),
   not committed anywhere — get the value from whoever last set it up, or
   rotate it and update the flow's URI to match.

**To sanity-check the bridge end to end:** submit the live Form once, then
check the Conduct Gig Reports section (New Cadets tab) for a new entry with
source `form`. If it doesn't show up, check the flow's run history in Power
Automate first — the HTTP action's response body is the exact error (401
wrong/missing secret, 400 a required field was blank or the body wasn't
JSON, 404 no cadet matched that name, 409 the name matched more than one
cadet).

## Author

James Bartelme III — [portfolio](https://james-bartelme-portfolio.pages.dev)
