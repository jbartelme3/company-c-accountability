import { useState } from "react";
import type { AbsenceReason, InspectionReason, LaundryType, LineupGigType, MajorGreenReason, MetricType, OffenseType, RoomGigPiPoint } from "../types";
import {
  ABSENCE_REASONS,
  INSPECTION_REASONS,
  LAUNDRY_TYPES,
  LAUNDRY_TYPE_LABELS,
  LINEUP_GIG_TYPES,
  LINEUP_GIG_TYPE_LABELS,
  MAJOR_GREEN_REASONS,
  OFFENSE_DETAILS,
  OFFENSE_DETAIL_OTHER,
  OFFENSE_TYPES,
  OFFENSE_TYPE_LABELS,
  ROOM_GIG_PI_POINTS,
  hasInspectionReason,
} from "../types";

const LABEL_CLASS = "block text-xs font-medium text-slate-600";
const SELECT_CLASS = "mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm";
const SELECT_FULL_CLASS = "mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm";
const HINT_CLASS = "mt-1 text-xs text-slate-400";

export interface MetricEntryFieldsPayload {
  laundry_type?: LaundryType | null;
  lineup_gig_type?: LineupGigType | null;
  offense_type?: OffenseType | null;
  offense_detail?: string | null;
  is_dc?: boolean | null;
  is_work_detail?: boolean | null;
  room_gig_pi?: boolean | null;
  room_gig_wardrobe?: boolean | null;
  room_gig_pi_point?: RoomGigPiPoint | null;
  absence_reason?: AbsenceReason | null;
  inspection_reason?: InspectionReason | null;
  major_green_reason?: MajorGreenReason | null;
}

// Every metric type's extra type-specific fields (sub-type dropdowns, Y/N
// flags) — state, validity, the JSON payload to merge into
// metricsApi.create()/update(), and the form controls to render for
// whichever `type` is currently selected. One hook shared by every place an
// entry gets added (MetricsTable's AddEntryForm, MetricEntryModal) so they
// can't drift apart on what each metric type requires.
export function useMetricEntryFields(type: MetricType | null) {
  const [laundryType, setLaundryType] = useState<LaundryType>("mixed_laundry");
  const [lineupGigType, setLineupGigType] = useState<LineupGigType>("room");
  const [offenseType, setOffenseType] = useState<OffenseType | "">("");
  const [offenseDetail, setOffenseDetail] = useState("");
  const [offenseDetailOther, setOffenseDetailOther] = useState("");
  const [isDc, setIsDc] = useState(false);
  const [isWorkDetail, setIsWorkDetail] = useState(false);
  const [roomGigPi, setRoomGigPi] = useState(false);
  const [roomGigWardrobe, setRoomGigWardrobe] = useState(false);
  const [roomGigPiPoint, setRoomGigPiPoint] = useState<RoomGigPiPoint | "">("");
  const [absenceReason, setAbsenceReason] = useState<AbsenceReason | "">("");
  const [inspectionReason, setInspectionReason] = useState<InspectionReason | "">("");
  const [majorGreenReason, setMajorGreenReason] = useState<MajorGreenReason | "">("");

  function handleOffenseTypeChange(next: OffenseType | "") {
    setOffenseType(next);
    setOffenseDetail("");
    setOffenseDetailOther("");
  }

  function reset() {
    setLaundryType("mixed_laundry");
    setLineupGigType("room");
    handleOffenseTypeChange("");
    setIsDc(false);
    setIsWorkDetail(false);
    setRoomGigPi(false);
    setRoomGigWardrobe(false);
    setRoomGigPiPoint("");
    setAbsenceReason("");
    setInspectionReason("");
    setMajorGreenReason("");
  }

  const resolvedOffenseDetail = offenseDetail === OFFENSE_DETAIL_OTHER ? offenseDetailOther.trim() : offenseDetail;

  let valid = true;
  if (type === "offense") {
    valid = !!offenseType && !!resolvedOffenseDetail;
  } else if (type === "daily_room_inspection_gig") {
    valid = (roomGigPi || roomGigWardrobe) && (!roomGigPi || !!roomGigPiPoint);
  } else if (type === "absence") {
    valid = !!absenceReason;
  } else if (type && hasInspectionReason(type)) {
    valid = !!inspectionReason;
  } else if (type === "major_green_inspection_gig") {
    valid = !!majorGreenReason;
  }

  const payload: MetricEntryFieldsPayload = {
    laundry_type: type === "laundry_gig" ? laundryType : undefined,
    lineup_gig_type: type === "new_cadet_lineup_gig" ? lineupGigType : undefined,
    offense_type: type === "offense" ? offenseType || undefined : undefined,
    offense_detail: type === "offense" ? resolvedOffenseDetail : undefined,
    is_dc: type === "offense" ? isDc : undefined,
    is_work_detail: type === "offense" || type === "absence" ? isWorkDetail : undefined,
    room_gig_pi: type === "daily_room_inspection_gig" ? roomGigPi : undefined,
    room_gig_wardrobe: type === "daily_room_inspection_gig" ? roomGigWardrobe : undefined,
    room_gig_pi_point: type === "daily_room_inspection_gig" && roomGigPi ? roomGigPiPoint || undefined : undefined,
    absence_reason: type === "absence" ? absenceReason || undefined : undefined,
    inspection_reason: type && hasInspectionReason(type) ? inspectionReason || undefined : undefined,
    major_green_reason: type === "major_green_inspection_gig" ? majorGreenReason || undefined : undefined,
  };

  const fields = (
    <>
      {type === "laundry_gig" && (
        <div>
          <label className={LABEL_CLASS}>Laundry type</label>
          <select value={laundryType} onChange={(e) => setLaundryType(e.target.value as LaundryType)} className={SELECT_CLASS}>
            {LAUNDRY_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {LAUNDRY_TYPE_LABELS[lt]}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === "new_cadet_lineup_gig" && (
        <div>
          <label className={LABEL_CLASS}>Gig for</label>
          <select value={lineupGigType} onChange={(e) => setLineupGigType(e.target.value as LineupGigType)} className={SELECT_CLASS}>
            {LINEUP_GIG_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {LINEUP_GIG_TYPE_LABELS[lt]}
                {lt === "conduct" ? " (worth 3)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === "offense" && (
        <>
          <div>
            <label className={LABEL_CLASS}>Offense type</label>
            <select
              required
              value={offenseType}
              onChange={(e) => handleOffenseTypeChange(e.target.value as OffenseType)}
              className={SELECT_CLASS}
            >
              <option value="">Select…</option>
              {OFFENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {offenseType && (
            <div className="w-full">
              <label className={LABEL_CLASS}>Offense</label>
              <select required value={offenseDetail} onChange={(e) => setOffenseDetail(e.target.value)} className={SELECT_FULL_CLASS}>
                <option value="">Select…</option>
                {OFFENSE_DETAILS[offenseType].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value={OFFENSE_DETAIL_OTHER}>Other…</option>
              </select>
              <p className={HINT_CLASS}>{OFFENSE_TYPE_LABELS[offenseType]}</p>
            </div>
          )}
          {offenseDetail === OFFENSE_DETAIL_OTHER && (
            <div className="w-full">
              <label className={LABEL_CLASS}>Describe the offense</label>
              <input
                required
                value={offenseDetailOther}
                onChange={(e) => setOffenseDetailOther(e.target.value)}
                className={SELECT_FULL_CLASS}
              />
            </div>
          )}
          <div>
            <label className={LABEL_CLASS}>DC?</label>
            <select value={isDc ? "yes" : "no"} onChange={(e) => setIsDc(e.target.value === "yes")} className={SELECT_CLASS}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {isDc && <p className={HINT_CLASS}>Also logs a DC entry.</p>}
          </div>
          <div>
            <label className={LABEL_CLASS}>Work Detail?</label>
            <select value={isWorkDetail ? "yes" : "no"} onChange={(e) => setIsWorkDetail(e.target.value === "yes")} className={SELECT_CLASS}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {isWorkDetail && <p className={HINT_CLASS}>Also logs a Work Detail entry.</p>}
          </div>
        </>
      )}

      {type === "daily_room_inspection_gig" && (
        <>
          <div>
            <label className={LABEL_CLASS}>P.I.?</label>
            <select value={roomGigPi ? "yes" : "no"} onChange={(e) => setRoomGigPi(e.target.value === "yes")} className={SELECT_CLASS}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Wardrobe?</label>
            <select
              value={roomGigWardrobe ? "yes" : "no"}
              onChange={(e) => setRoomGigWardrobe(e.target.value === "yes")}
              className={SELECT_CLASS}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {roomGigPi && (
            <div className="w-full">
              <label className={LABEL_CLASS}>Point of P.I.</label>
              <select
                required
                value={roomGigPiPoint}
                onChange={(e) => setRoomGigPiPoint(e.target.value as RoomGigPiPoint)}
                className={SELECT_FULL_CLASS}
              >
                <option value="">Select…</option>
                {ROOM_GIG_PI_POINTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {type === "absence" && (
        <>
          <div>
            <label className={LABEL_CLASS}>Reason</label>
            <select
              required
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value as AbsenceReason)}
              className={SELECT_CLASS}
            >
              <option value="">Select…</option>
              {ABSENCE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Work Detail?</label>
            <select value={isWorkDetail ? "yes" : "no"} onChange={(e) => setIsWorkDetail(e.target.value === "yes")} className={SELECT_CLASS}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {isWorkDetail && <p className={HINT_CLASS}>Also logs a Work Detail entry.</p>}
          </div>
        </>
      )}

      {type && hasInspectionReason(type) && (
        <div>
          <label className={LABEL_CLASS}>Reason</label>
          <select
            required
            value={inspectionReason}
            onChange={(e) => setInspectionReason(e.target.value as InspectionReason)}
            className={SELECT_CLASS}
          >
            <option value="">Select…</option>
            {INSPECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === "major_green_inspection_gig" && (
        <div>
          <label className={LABEL_CLASS}>Reason</label>
          <select
            required
            value={majorGreenReason}
            onChange={(e) => setMajorGreenReason(e.target.value as MajorGreenReason)}
            className={SELECT_CLASS}
          >
            <option value="">Select…</option>
            {MAJOR_GREEN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  return { fields, valid, payload, reset };
}
