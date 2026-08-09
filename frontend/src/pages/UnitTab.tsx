import { useEffect, useState } from "react";
import { unitAwardsApi, unitsApi } from "../api/client";
import type { UnitAward, UnitCompilation, UnitType } from "../types";
import { LEADER_POSITION_FOR_UNIT, UNIT_TYPE_LABELS } from "../types";
import UnitCard from "../components/UnitCard";
import UnitOfWeekSection from "../components/UnitOfWeekSection";

export default function UnitTab({ unitType }: { unitType: UnitType }) {
  const [data, setData] = useState<UnitCompilation | null>(null);
  const [awards, setAwards] = useState<UnitAward[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [compiled, awardList] = await Promise.all([unitsApi.compile(unitType), unitAwardsApi.list(unitType)]);
      setData(compiled);
      setAwards(awardList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitType]);

  const label = UNIT_TYPE_LABELS[unitType];
  const leaderPosition = LEADER_POSITION_FOR_UNIT[unitType];

  if (loading || !data) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">{label}s</h2>

        {data.units.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
            No {leaderPosition} on the roster yet — add one from the Cadets tab to start a {label.toLowerCase()}.
          </p>
        ) : (
          <div className="space-y-3">
            {data.units.map((unit) => (
              <UnitCard key={unit.leader.id} unitType={unitType} unit={unit} />
            ))}
          </div>
        )}

        {data.unassigned.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Unassigned ({data.unassigned.length})</h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {data.unassigned.map((c) => (
                <li key={c.id}>
                  {c.last_name}, {c.first_name} ({c.position})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <UnitOfWeekSection unitType={unitType} awards={awards} leaders={data.units.map((u) => u.leader)} onChanged={load} />
    </div>
  );
}
