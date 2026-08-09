// Buckets dated entries into ISO weeks (Monday-start) for a trend chart.
// This is a simplification of the handbook's actual evaluation periods
// (Sun-Sat in fall/spring, Wed-Tue in winter) — close enough for a trend line.

function startOfIsoWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export interface WeeklySeries {
  key: string;
  label: string;
  color: string;
  points: { week: string; count: number }[];
}

/**
 * Given a list of {type, entry_date} items and a set of {key,label,color}
 * series definitions, buckets counts per ISO week per series, filling zero
 * weeks in between so lines don't skip gaps.
 */
export function buildWeeklySeries<T extends { entry_date: string }>(
  entries: T[],
  getKey: (entry: T) => string,
  seriesDefs: { key: string; label: string; color: string }[],
): WeeklySeries[] {
  if (entries.length === 0) {
    return seriesDefs.map((s) => ({ ...s, points: [] }));
  }

  const counts = new Map<string, Map<string, number>>(); // week -> key -> count
  let minWeek = "";
  let maxWeek = "";

  for (const entry of entries) {
    const week = startOfIsoWeek(entry.entry_date);
    const key = getKey(entry);
    if (!counts.has(week)) counts.set(week, new Map());
    const weekMap = counts.get(week)!;
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    if (!minWeek || week < minWeek) minWeek = week;
    if (!maxWeek || week > maxWeek) maxWeek = week;
  }

  const allWeeks: string[] = [];
  const cursor = new Date(minWeek + "T00:00:00");
  const end = new Date(maxWeek + "T00:00:00");
  while (cursor <= end) {
    allWeeks.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 7);
  }

  return seriesDefs.map((s) => ({
    ...s,
    points: allWeeks.map((week) => ({ week, count: counts.get(week)?.get(s.key) ?? 0 })),
  }));
}
