import { useEffect, useState } from "react";
import { ApiError, cadetsApi, rankHistoryApi } from "../api/client";
import type { CadetProfile as CadetProfileType, MetricType, UnitType } from "../types";
import {
  LEADER_POSITION_FOR_UNIT,
  METRIC_LABELS,
  METRIC_TYPE_ORDER,
  UNIT_TYPE_LABELS,
  formatClassYear,
  formatPosition,
  formatRank,
  formatSecondaryPosition,
  isEligibleForNewCadetLineupGig,
  isPlatoonEligible,
  isSquadEligible,
  isTeamEligible,
} from "../types";
import MetricBadge from "../components/MetricBadge";
import MetricEntryModal from "../components/MetricEntryModal";
import CadetForm from "../components/CadetForm";

export default function CadetProfile({ cadetId, onBack }: { cadetId: number; onBack: () => void }) {
  const [profile, setProfile] = useState<CadetProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [openType, setOpenType] = useState<MetricType | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await cadetsApi.get(cadetId);
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadetId]);

  if (loading || !profile) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <h2 className="mt-4 mb-3 text-lg font-bold text-slate-900">Edit Cadet</h2>
        <CadetForm
          submitLabel="Save Changes"
          initial={{
            first_name: profile.first_name,
            last_name: profile.last_name,
            position: profile.position,
            rank: profile.rank,
            class_year: profile.class_year,
            secondary_position: profile.secondary_position,
            team_leader_id: profile.team_leader_id,
            squad_leader_id: profile.squad_leader_id,
            platoon_leader_id: profile.platoon_leader_id,
          }}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await cadetsApi.update(cadetId, values);
            setEditing(false);
            load();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <BackButton onBack={onBack} />

      <div className={`mt-4 rounded-lg border p-5 ${profile.is_cadre ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className={`text-xl font-bold ${profile.is_cadre ? "text-blue-900" : "text-slate-900"}`}>
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="mt-1 text-sm text-slate-600">Position: {formatPosition(profile.position)}</p>
            <p className="mt-0.5 text-sm text-slate-600">Rank: {formatRank(profile.rank)}</p>
            <p className="mt-0.5 text-sm text-slate-600">Class Year: {formatClassYear(profile.class_year)}</p>
            {profile.secondary_position && (
              <p className="mt-0.5 text-sm text-slate-600">Secondary Duty: {formatSecondaryPosition(profile.secondary_position)}</p>
            )}
            {profile.is_cadre && <p className="mt-1 text-sm font-medium text-blue-800">Cadre</p>}
            <UnitAssignments profile={profile} />
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Cadet Metrics</h3>

        {METRIC_TYPE_ORDER.map((type) => {
          const typeEntries = profile.metric_entries.filter((e) => e.type === type);
          const eligible = type !== "new_cadet_lineup_gig" || isEligibleForNewCadetLineupGig(profile);
          return (
            <button
              key={type}
              onClick={() => setOpenType(type)}
              className={`flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 ${
                eligible ? "" : "opacity-60"
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">{METRIC_LABELS[type]}</span>
              <span className="flex items-center gap-2">
                <MetricBadge type={type} count={typeEntries.length} />
                <span className="text-xs text-slate-400">
                  {!eligible ? "N/A" : typeEntries.length === 0 ? "Add" : "View"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {openType && (
        <MetricEntryModal
          cadetId={cadetId}
          cadetName={`${profile.first_name} ${profile.last_name}`}
          type={openType}
          entries={profile.metric_entries.filter((e) => e.type === openType)}
          canAdd={openType !== "new_cadet_lineup_gig" || isEligibleForNewCadetLineupGig(profile)}
          ineligibleReason="New Cadet Lineup Gigs only apply to cadets currently holding the New Cadet rank."
          onClose={() => setOpenType(null)}
          onChanged={load}
        />
      )}

      <RankHistorySection entries={profile.rank_history} onChanged={load} />
    </div>
  );
}

function RankHistorySection({ entries, onChanged }: { entries: CadetProfileType["rank_history"]; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);

  if (entries.length === 0) return null;

  async function remove(id: number) {
    if (!confirm("Remove this rank history entry?")) return;
    setError(null);
    try {
      await rankHistoryApi.remove(id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove entry.");
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Rank History</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${i > 0 ? "border-t border-slate-100" : ""}`}
          >
            <span className="text-slate-800">
              {formatRank(entry.previous_rank)} → {formatRank(entry.new_rank)}
              {entry.make_number != null && ` (Make ${entry.make_number})`}
              {entry.note && <span className="text-slate-500"> · {entry.note}</span>}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{entry.created_at.slice(0, 10)}</span>
              <button onClick={() => remove(entry.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                Remove
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnitAssignments({ profile }: { profile: CadetProfileType }) {
  const allRows: { unitType: UnitType; leaderName: string | null; leaderId: number | null }[] = [
    { unitType: "team", leaderName: profile.team_leader_name, leaderId: profile.team_leader_id },
    { unitType: "squad", leaderName: profile.squad_leader_name, leaderId: profile.squad_leader_id },
    { unitType: "platoon", leaderName: profile.platoon_leader_name, leaderId: profile.platoon_leader_id },
  ];
  const rows = allRows.filter((r) => {
    if (r.unitType === "team") return isTeamEligible(profile.position);
    if (r.unitType === "squad") return isSquadEligible(profile.position);
    return isPlatoonEligible(profile.position);
  });

  if (rows.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {rows.map((r) => {
        const unitNoun = UNIT_TYPE_LABELS[r.unitType].toLowerCase();
        const isLeader = profile.position === LEADER_POSITION_FOR_UNIT[r.unitType];
        const value = isLeader ? `Leads own ${unitNoun}` : r.leaderName ? `${r.leaderName}'s ${unitNoun}` : "Unassigned";
        return (
          <span
            key={r.unitType}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
          >
            {UNIT_TYPE_LABELS[r.unitType]}: {value}
          </span>
        );
      })}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-slate-800">
      ← Back to roster
    </button>
  );
}
