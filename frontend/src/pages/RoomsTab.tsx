import { useEffect, useState } from "react";
import { cadetsApi, metricsApi } from "../api/client";
import type { Cadet, CadetProfile as CadetProfileType, MetricEntry } from "../types";
import { formatPosition } from "../types";
import CadetProfile from "./CadetProfile";
import MetricEntryModal from "../components/MetricEntryModal";

interface Room {
  number: string;
  occupants: Cadet[];
}

// Rooms are just cadets sharing the same room_number — no separate rooms
// table (see worker/db/schema.sql). Room numbers sort numerically where
// possible ("301" < "302"), falling back to plain string order for
// anything non-numeric.
function compareRoomNumbers(a: string, b: string): number {
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return a.localeCompare(b);
}

function groupByRoom(cadets: Cadet[]): { rooms: Room[]; unassigned: Cadet[] } {
  const byRoom = new Map<string, Cadet[]>();
  const unassigned: Cadet[] = [];
  for (const c of cadets) {
    if (!c.room_number) {
      unassigned.push(c);
      continue;
    }
    const list = byRoom.get(c.room_number) ?? [];
    list.push(c);
    byRoom.set(c.room_number, list);
  }
  const rooms = Array.from(byRoom.entries())
    .map(([number, occupants]) => ({
      number,
      occupants: [...occupants].sort((a, b) => a.last_name.localeCompare(b.last_name)),
    }))
    .sort((a, b) => compareRoomNumbers(a.number, b.number));
  unassigned.sort((a, b) => a.last_name.localeCompare(b.last_name));
  return { rooms, unassigned };
}

// "Room 320 (James Capozzi & roommate)" — makes clear from the modal title
// alone that adding this gig will auto-log it for the roommate(s) too.
function addingModalTitle(cadet: CadetProfileType, allCadets: Cadet[]): string {
  const name = `${cadet.first_name} ${cadet.last_name}`;
  if (!cadet.room_number) return name;
  const roommateCount = allCadets.filter((c) => c.id !== cadet.id && c.room_number === cadet.room_number).length;
  const suffix = roommateCount > 0 ? ` & roommate${roommateCount > 1 ? "s" : ""}` : "";
  return `Room ${cadet.room_number} (${name}${suffix})`;
}

export default function RoomsTab() {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [roomGigs, setRoomGigs] = useState<MetricEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCadetId, setSelectedCadetId] = useState<number | null>(null);
  const [addingCadet, setAddingCadet] = useState<CadetProfileType | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [cadetList, gigs] = await Promise.all([cadetsApi.list(), metricsApi.list({ type: "daily_room_inspection_gig" })]);
      setCadets(cadetList);
      setRoomGigs(gigs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openAdd(cadetId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setAddingCadet(await cadetsApi.get(cadetId));
  }

  async function refreshAddingCadet() {
    if (!addingCadet) return;
    setAddingCadet(await cadetsApi.get(addingCadet.id));
    load();
  }

  if (selectedCadetId !== null) {
    return (
      <CadetProfile
        cadetId={selectedCadetId}
        onBack={() => {
          setSelectedCadetId(null);
          load();
        }}
      />
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  const { rooms, unassigned } = groupByRoom(cadets);
  const gigCountByCadet = new Map<number, number>();
  for (const g of roomGigs) {
    gigCountByCadet.set(g.cadet_id, (gigCountByCadet.get(g.cadet_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Rooms</h2>
        <p className="mt-1 text-sm text-slate-500">
          Roommates for Room Inspection gigs — log one for either roommate and both get it automatically.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2">Occupants</th>
                <th className="px-4 py-2">Room Inspection Gigs</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-slate-400">
                    No cadets have a room assigned yet — set one from a cadet's Edit form.
                  </td>
                </tr>
              )}
              {rooms.map((room) => {
                // Properly-paired entries always match across roommates; take
                // the max so a legacy single-sided entry (logged before this
                // feature existed) still shows as 1 incident, not double-counted.
                const gigCount = Math.max(0, ...room.occupants.map((o) => gigCountByCadet.get(o.id) ?? 0));
                return (
                  <tr key={room.number} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-semibold text-slate-800">{room.number}</td>
                    <td className="px-4 py-2">
                      {room.occupants.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && <span className="text-slate-300"> · </span>}
                          <button onClick={() => setSelectedCadetId(o.id)} className="text-slate-700 hover:text-slate-900 hover:underline">
                            {o.last_name}, {o.first_name}
                          </button>
                          <span className="text-xs text-slate-400"> ({formatPosition(o.position)})</span>
                        </span>
                      ))}
                      {room.occupants.length === 1 && <span className="ml-2 text-xs text-slate-400">(single)</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{gigCount}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => openAdd(room.occupants[0].id, e)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">No Room Assigned</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unassigned.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCadetId(c.id)}
                className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                {c.last_name}, {c.first_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {addingCadet && (
        <MetricEntryModal
          cadetId={addingCadet.id}
          cadetName={addingModalTitle(addingCadet, cadets)}
          cadet={addingCadet}
          type="daily_room_inspection_gig"
          entries={addingCadet.metric_entries}
          onClose={() => setAddingCadet(null)}
          onChanged={refreshAddingCadet}
        />
      )}
    </div>
  );
}
