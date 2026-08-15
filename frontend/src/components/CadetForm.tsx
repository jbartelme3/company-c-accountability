import { useEffect, useState } from "react";
import { ApiError, cadetsApi } from "../api/client";
import type { Cadet, UnitType } from "../types";
import {
  BATTALION_POSITIONS,
  CLASSMAN_LABELS,
  CLASS_YEARS,
  LEADER_POSITION_FOR_UNIT,
  MAKE_NUMBERS,
  POSITION_MIN_RANK,
  RANKS,
  RANK_ABBREVIATIONS,
  REGIMENTAL_POSITIONS,
  SECONDARY_POSITIONS,
  UNIT_POSITIONS,
  UNIT_TYPE_LABELS,
  formatRank,
  isClassYearEligibleForPosition,
  isClassYearEligibleForSecondaryPosition,
  isPlatoonEligible,
  isSquadEligible,
  isTeamEligible,
  rankAfterPositionChange,
} from "../types";

export interface CadetFormValues {
  first_name: string;
  last_name: string;
  position: string;
  rank: string | null;
  class_year: string | null;
  secondary_position: string | null;
  team_leader_id: number | null;
  squad_leader_id: number | null;
  platoon_leader_id: number | null;
  make_number?: number | null;
  rank_change_note?: string | null;
}

export default function CadetForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CadetFormValues>;
  submitLabel: string;
  onSubmit: (values: CadetFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "Element");
  const [rank, setRank] = useState(initial?.rank ?? "New Cadet");
  const [classYear, setClassYear] = useState(initial?.class_year ?? "");
  const [secondaryPosition, setSecondaryPosition] = useState(initial?.secondary_position ?? "");
  const [teamLeaderId, setTeamLeaderId] = useState<number | null>(initial?.team_leader_id ?? null);
  const [squadLeaderId, setSquadLeaderId] = useState<number | null>(initial?.squad_leader_id ?? null);
  const [platoonLeaderId, setPlatoonLeaderId] = useState<number | null>(initial?.platoon_leader_id ?? null);
  const [makeNumber, setMakeNumber] = useState("");
  const [rankChangeNote, setRankChangeNote] = useState("");
  const [allCadets, setAllCadets] = useState<Cadet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only an edit (never a brand-new cadet) can have a "previous" rank to
  // record — and only once the rank dropdown actually differs from what it
  // started at, so the make/note fields stay out of the way otherwise.
  const isEditing = initial !== undefined;
  const rankChanged = isEditing && rank !== (initial?.rank ?? null);

  useEffect(() => {
    cadetsApi.list().then(setAllCadets).catch(() => {});
  }, []);

  // Streamlining rule: a cadet following a team is always in that Team
  // Leader's own squad and platoon, and a cadet directly in a squad is
  // always in that Squad Leader's own platoon — neither is an independent
  // choice once picked (enforced server-side too, via
  // reconcileUnitInheritance; these two effects just keep the form's
  // displayed values from going stale before save). Two separate effects
  // chain correctly across renders: picking a team updates squadLeaderId,
  // which then feeds the second effect to derive platoonLeaderId from that
  // (now-current) squad, same two-pass order the backend uses.
  useEffect(() => {
    if (!teamLeaderId) return;
    const leader = allCadets.find((c) => c.id === teamLeaderId);
    if (leader) {
      setSquadLeaderId(leader.squad_leader_id);
      setPlatoonLeaderId(leader.platoon_leader_id);
    }
  }, [teamLeaderId, allCadets]);

  useEffect(() => {
    if (!squadLeaderId || position === "Squad Leader") return;
    const leader = allCadets.find((c) => c.id === squadLeaderId);
    if (leader) setPlatoonLeaderId(leader.platoon_leader_id);
  }, [squadLeaderId, allCadets, position]);

  function resetUnitAssignments() {
    setTeamLeaderId(null);
    setSquadLeaderId(null);
    setPlatoonLeaderId(null);
  }

  // "Position makes the rank": moving to a position with a higher minimum
  // bumps rank up to match; moving to a lower-minimum position never
  // demotes — the current rank is left as-is (except for acting-rank billets
  // like Operations Sergeant/Sergeant Major/Platoon Sergeant, which reset to
  // Sergeant once you leave them — see rankAfterPositionChange). The rank
  // field stays editable afterward for manual corrections (e.g. a
  // disciplinary reduction). A position change also always clears whatever
  // Team/Squad/Platoon this cadet was assigned to — the old assignment may no
  // longer be eligible or meaningful under the new position.
  function handlePositionChange(newPosition: string) {
    const oldPosition = position;
    setPosition(newPosition);
    setRank((currentRank) => rankAfterPositionChange(currentRank, oldPosition, newPosition, classYear || null));
    if (newPosition !== oldPosition) resetUnitAssignments();
  }

  // Class year affects Platoon Sergeant's acting rank (Junior -> Sergeant,
  // Senior -> Staff Sergeant); recompute if that position is currently held.
  function handleClassYearChange(newClassYear: string) {
    setClassYear(newClassYear);
    setRank((currentRank) => rankAfterPositionChange(currentRank, position, position, newClassYear || null));
  }

  // A cadet whose rank is New Cadet is always an Element — the New Cadet
  // System doesn't have a rank-and-file cadet holding a leadership billet.
  function handleRankChange(newRank: string) {
    setRank(newRank);
    if (newRank === "New Cadet" && position !== "Element") {
      setPosition("Element");
      resetUnitAssignments();
    }
  }

  const classYearMismatch = classYear !== "" && !isClassYearEligibleForPosition(classYear, position);
  const secondaryClassYearMismatch =
    classYear !== "" && !isClassYearEligibleForSecondaryPosition(classYear, secondaryPosition || null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        first_name: firstName,
        last_name: lastName,
        position,
        rank: rank || null,
        class_year: classYear || null,
        secondary_position: secondaryPosition || null,
        team_leader_id: isTeamEligible(position) ? teamLeaderId : null,
        squad_leader_id: isSquadEligible(position) ? squadLeaderId : null,
        platoon_leader_id: isPlatoonEligible(position) ? platoonLeaderId : null,
        make_number: rankChanged && makeNumber ? Number(makeNumber) : null,
        rank_change_note: rankChanged ? rankChangeNote.trim() || null : null,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">First name</label>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Last name</label>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Class Year</label>
          <select
            value={classYear}
            onChange={(e) => handleClassYearChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">Not set</option>
            {CLASS_YEARS.map((cy) => (
              <option key={cy} value={cy}>
                {cy} ({CLASSMAN_LABELS[cy]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Rank</label>
          <select
            value={rank ?? ""}
            onChange={(e) => handleRankChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r} ({RANK_ABBREVIATIONS[r]})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">Minimum for {position}: {formatRank(POSITION_MIN_RANK[position] ?? null)}</p>
        </div>

        {rankChanged && (
          <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Record This Rank Change ({formatRank(initial?.rank ?? null)} → {formatRank(rank)})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Make (optional)</label>
                <select
                  value={makeNumber}
                  onChange={(e) => setMakeNumber(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                >
                  <option value="">Not tied to a make</option>
                  {MAKE_NUMBERS.map((m) => (
                    <option key={m} value={m}>
                      Make {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
                <input
                  value={rankChangeNote}
                  onChange={(e) => setRankChangeNote(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600">Position</label>
          <select
            value={position}
            onChange={(e) => handlePositionChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            <optgroup label="Company C (Unit)">
              {UNIT_POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </optgroup>
            <optgroup label="Infantry Battalion Staff">
              {BATTALION_POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </optgroup>
            <optgroup label="Regimental Staff">
              {REGIMENTAL_POSITIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({p.abbrev})
                </option>
              ))}
            </optgroup>
          </select>
          {classYearMismatch && (
            <p className="mt-1 text-xs text-red-600">{classYear} cadets aren't normally eligible for {position}.</p>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600">Secondary / Collateral Duty (optional)</label>
          <select
            value={secondaryPosition}
            onChange={(e) => setSecondaryPosition(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">None</option>
            {SECONDARY_POSITIONS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} ({p.abbrev})
              </option>
            ))}
          </select>
          {secondaryClassYearMismatch && (
            <p className="mt-1 text-xs text-red-600">
              {classYear} cadets aren't normally eligible for {secondaryPosition}.
            </p>
          )}
        </div>

        {(isTeamEligible(position) || isSquadEligible(position) || isPlatoonEligible(position)) && (
          <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Small-Unit Assignment</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {isTeamEligible(position) && (
                <UnitAssignmentField
                  unitType="team"
                  position={position}
                  allCadets={allCadets}
                  value={teamLeaderId}
                  onChange={setTeamLeaderId}
                />
              )}
              {isSquadEligible(position) && (
                <UnitAssignmentField
                  unitType="squad"
                  position={position}
                  allCadets={allCadets}
                  value={squadLeaderId}
                  onChange={setSquadLeaderId}
                  inheritedFrom={isTeamEligible(position) && teamLeaderId ? { id: teamLeaderId, via: "team" } : null}
                />
              )}
              {isPlatoonEligible(position) && (
                <UnitAssignmentField
                  unitType="platoon"
                  position={position}
                  allCadets={allCadets}
                  value={platoonLeaderId}
                  onChange={setPlatoonLeaderId}
                  inheritedFrom={
                    isTeamEligible(position) && teamLeaderId
                      ? { id: teamLeaderId, via: "team" }
                      : isSquadEligible(position) && squadLeaderId && position !== "Squad Leader"
                        ? { id: squadLeaderId, via: "squad" }
                        : null
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// A cadet holding a unit's leader billet always *is* that unit — shown
// read-only. Everyone else eligible for this unit type picks which leader's
// unit they belong to from a dropdown of cadets currently holding that
// leader billet.
function UnitAssignmentField({
  unitType,
  position,
  allCadets,
  value,
  onChange,
  inheritedFrom,
}: {
  unitType: UnitType;
  position: string;
  allCadets: Cadet[];
  value: number | null;
  onChange: (id: number | null) => void;
  /** For squad/platoon only: when set, this field is inherited from whichever Team/Squad Leader this cadet follows, not independently chosen (see the streamlining useEffects in CadetForm). */
  inheritedFrom?: { id: number; via: UnitType } | null;
}) {
  const leaderPosition = LEADER_POSITION_FOR_UNIT[unitType];
  const isLeader = position === leaderPosition;
  const leaders = allCadets.filter((c) => c.position === leaderPosition);
  const source = inheritedFrom ? allCadets.find((c) => c.id === inheritedFrom.id) : null;
  const inheritedLeader = source ? leaders.find((l) => l.id === value) : null;

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">{UNIT_TYPE_LABELS[unitType]}</label>
      {isLeader ? (
        <p className="mt-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-500">
          Leads own {unitType}
        </p>
      ) : source && inheritedFrom ? (
        <p className="mt-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-500">
          {inheritedLeader
            ? `${inheritedLeader.first_name} ${inheritedLeader.last_name}'s ${unitType} (same as ${source.first_name}'s ${inheritedFrom.via})`
            : `Unassigned (same as ${source.first_name}'s ${inheritedFrom.via})`}
        </p>
      ) : (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        >
          <option value="">Unassigned</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.first_name} {l.last_name}'s {UNIT_TYPE_LABELS[unitType]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
