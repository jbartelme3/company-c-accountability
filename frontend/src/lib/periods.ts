// Date-range helpers for the auto Team/Squad/Platoon/New-Cadet-of-the-
// Week/Month/Make standings (see gigScore.ts). Week uses the same ISO-week
// (Monday-start) convention as weeklyBucket.ts's trend charts.
import type { MakePeriod } from "../types";
import { startOfIsoWeek } from "./weeklyBucket";

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The Monday-Sunday ISO week containing `today` (defaults to now). */
export function currentIsoWeekRange(today: string = todayIso()): DateRange {
  const start = startOfIsoWeek(today);
  const end = addDays(start, 6);
  return { start, end, label: `Week of ${formatShort(start)}` };
}

/** The calendar month containing `today` (defaults to now). */
export function currentMonthRange(today: string = todayIso()): DateRange {
  const d = new Date(today + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return { start, end, label };
}

/** Whichever configured make_period's date range contains `today`, if any. */
export function findCurrentMake(periods: MakePeriod[], today: string = todayIso()): (DateRange & { make_number: number }) | null {
  const match = periods.find((p) => p.start_date <= today && today <= p.end_date);
  if (!match) return null;
  return { start: match.start_date, end: match.end_date, make_number: match.make_number, label: `Make ${match.make_number}` };
}
