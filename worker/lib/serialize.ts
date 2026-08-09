import type { BannerResultRow, CadetRow, MetricEntryRow, UnitAwardRow } from "../types";
import { isCadre } from "./metrics";

export function serializeCadet(row: CadetRow) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    position: row.position,
    rank: row.rank,
    class_year: row.class_year,
    secondary_position: row.secondary_position,
    is_cadre: isCadre(row),
    team_leader_id: row.team_leader_id,
    squad_leader_id: row.squad_leader_id,
    platoon_leader_id: row.platoon_leader_id,
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

export function serializeBannerResult(row: BannerResultRow) {
  return {
    id: row.id,
    entry_date: row.entry_date,
    make_number: row.make_number,
    battalion_rank: row.battalion_rank,
    battalion_score: row.battalion_score,
    regimental_rank: row.regimental_rank,
    regimental_score: row.regimental_score,
    note: row.note,
  };
}

export function serializeUnitAward(row: UnitAwardRow & { leader_first_name: string; leader_last_name: string }) {
  return {
    id: row.id,
    entry_date: row.entry_date,
    unit_type: row.unit_type,
    leader_cadet_id: row.leader_cadet_id,
    leader_name: `${row.leader_first_name} ${row.leader_last_name}`,
    note: row.note,
  };
}
