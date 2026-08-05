import type { CadetRow, MetricEntryRow } from "../types";
import { isCadre } from "./metrics";

export function serializeCadet(row: CadetRow) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    position: row.position,
    rank: row.rank,
    is_cadre: isCadre(row),
  };
}

export function serializeMetricEntry(row: MetricEntryRow) {
  return {
    id: row.id,
    cadet_id: row.cadet_id,
    type: row.type,
    laundry_type: row.laundry_type,
    entry_date: row.entry_date,
    note: row.note,
  };
}
