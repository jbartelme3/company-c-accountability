import { useState } from "react";
import type { WeeklySeries } from "../lib/weeklyBucket";
import { CHART_INK } from "../lib/chartPalette";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 28, left: 32 };

function formatWeek(week: string): string {
  const d = new Date(week + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MetricsTrendChart({ title, series }: { title: string; series: WeeklySeries[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const weeks = series[0]?.points.map((p) => p.week) ?? [];
  const hasData = weeks.length > 0 && series.some((s) => s.points.some((p) => p.count > 0));

  const maxCount = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.count)));
  // Round the axis max up to a clean step.
  const step = maxCount <= 5 ? 1 : maxCount <= 10 ? 2 : maxCount <= 25 ? 5 : Math.ceil(maxCount / 5 / 5) * 5;
  const yMax = Math.ceil(maxCount / step) * step;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  function xFor(i: number): number {
    return weeks.length <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (weeks.length - 1)) * innerW;
  }
  function yFor(count: number): number {
    return PAD.top + innerH - (count / yMax) * innerH;
  }

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    if (weeks.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const frac = weeks.length <= 1 ? 0 : (relX - PAD.left) / innerW;
    const idx = Math.round(frac * (weeks.length - 1));
    setHoverIndex(Math.max(0, Math.min(weeks.length - 1, idx)));
  }

  const yTicks = [0, yMax / 2, yMax].map((v) => Math.round(v));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {!hasData && <p className="py-8 text-center text-sm text-slate-400">No entries logged yet.</p>}

      {hasData && showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1 pr-3">Week of</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1 pr-3">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, i) => (
                <tr key={week} className="border-b border-slate-100">
                  <td className="py-1 pr-3 text-slate-700">{formatWeek(week)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 pr-3 text-slate-600">
                      {s.points[i]?.count ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasData && !showTable && (
        <div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${title} trend chart`}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(v)} y2={yFor(v)} stroke={CHART_INK.gridline} strokeWidth={1} />
                <text x={PAD.left - 6} y={yFor(v)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill={CHART_INK.muted}>
                  {v}
                </text>
              </g>
            ))}
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={PAD.top + innerH}
              y2={PAD.top + innerH}
              stroke={CHART_INK.baseline}
              strokeWidth={1}
            />

            {weeks.length === 1 && (
              <text x={xFor(0)} y={HEIGHT - 8} textAnchor="middle" fontSize={9} fill={CHART_INK.muted}>
                Week of {formatWeek(weeks[0])}
              </text>
            )}
            {weeks.length > 1 && (
              <>
                <text x={xFor(0)} y={HEIGHT - 8} textAnchor="start" fontSize={9} fill={CHART_INK.muted}>
                  {formatWeek(weeks[0])}
                </text>
                <text x={xFor(weeks.length - 1)} y={HEIGHT - 8} textAnchor="end" fontSize={9} fill={CHART_INK.muted}>
                  {formatWeek(weeks[weeks.length - 1])}
                </text>
              </>
            )}

            {series.map((s) => {
              const path = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.count)}`).join(" ");
              return (
                <g key={s.key}>
                  <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {/* A single-point series draws no line segment, so every point also gets a small marker. */}
                  {s.points.map((p, i) => (
                    <circle key={i} cx={xFor(i)} cy={yFor(p.count)} r={3} fill={s.color} stroke={CHART_INK.surface} strokeWidth={1.5} />
                  ))}
                </g>
              );
            })}

            {hoverIndex !== null && (
              <>
                <line
                  x1={xFor(hoverIndex)}
                  x2={xFor(hoverIndex)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  stroke={CHART_INK.baseline}
                  strokeWidth={1}
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={xFor(hoverIndex)}
                    cy={yFor(s.points[hoverIndex]?.count ?? 0)}
                    r={4}
                    fill={s.color}
                    stroke={CHART_INK.surface}
                    strokeWidth={2}
                  />
                ))}
              </>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </svg>

          {hoverIndex !== null && weeks[hoverIndex] && (
            <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="mb-1 font-semibold text-slate-700">Week of {formatWeek(weeks[hoverIndex])}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {series.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-500">{s.label}:</span>
                    <span className="font-semibold text-slate-800">{s.points[hoverIndex]?.count ?? 0}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {series.length >= 2 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2">
              {series.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="inline-block h-0.5 w-3" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
