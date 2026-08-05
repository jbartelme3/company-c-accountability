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

## Author

James Bartelme III — [portfolio](https://james-bartelme-portfolio.pages.dev)
