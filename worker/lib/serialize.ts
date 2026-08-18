import type { BannerResultRow, CadetRow, ConductGigReportRow, MakePeriodRow, MetricEntryRow, RankHistoryRow, UnitAwardRow } from "../types";
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
    room_number: row.room_number,
  };
}

export function serializeMetricEntry(row: MetricEntryRow) {
  return {
    id: row.id,
    cadet_id: row.cadet_id,
    type: row.type,
    laundry_type: row.laundry_type,
    lineup_gig_type: row.lineup_gig_type,
    room_gig_group_id: row.room_gig_group_id,
    offense_type: row.offense_type,
    offense_detail: row.offense_detail,
    is_dc: row.is_dc == null ? null : !!row.is_dc,
    is_work_detail: row.is_work_detail == null ? null : !!row.is_work_detail,
    source_entry_id: row.source_entry_id,
    room_gig_pi: row.room_gig_pi == null ? null : !!row.room_gig_pi,
    room_gig_wardrobe: row.room_gig_wardrobe == null ? null : !!row.room_gig_wardrobe,
    room_gig_pi_point: row.room_gig_pi_point,
    absence_reason: row.absence_reason,
    inspection_reason: row.inspection_reason,
    major_green_reason: row.major_green_reason,
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

export function serializeRankHistory(row: RankHistoryRow) {
  return {
    id: row.id,
    cadet_id: row.cadet_id,
    make_number: row.make_number,
    previous_rank: row.previous_rank,
    new_rank: row.new_rank,
    note: row.note,
    created_at: row.created_at,
  };
}

export function serializeConductGigReport(row: ConductGigReportRow & { cadet_first_name: string; cadet_last_name: string }) {
  return {
    id: row.id,
    reporter_name: row.reporter_name,
    cadet_id: row.cadet_id,
    cadet_name: `${row.cadet_first_name} ${row.cadet_last_name}`,
    entry_date: row.entry_date,
    reasoning: row.reasoning,
    source: row.source,
    created_at: row.created_at,
  };
}

export function serializeMakePeriod(row: MakePeriodRow) {
  return {
    make_number: row.make_number,
    start_date: row.start_date,
    end_date: row.end_date,
  };
}
