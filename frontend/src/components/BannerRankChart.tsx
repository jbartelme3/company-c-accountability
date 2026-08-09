import { useState } from "react";
import { CHART_INK } from "../lib/chartPalette";

const WIDTH = 640;
const HEIGHT = 180;
const PAD = { top: 12, right: 16, bottom: 28, left: 32 };

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// A single-series rank-over-time line, Y axis inverted (1st place at the
// top) since lower rank is better. `maxRank` sets the fixed axis domain
// (3 for Battalion Banner, 9 for Regimental Banner).
export default function BannerRankChart({
  title,
  color,
  maxRank,
  points,
}: {
  title: string;
  color: string;
  maxRank: number;
  points: { date: string; rank: number }[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasData = points.length > 0;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  function xFor(i: number): number {
    return points.length <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (points.length - 1)) * innerW;
  }
  // Inverted: rank 1 -> top of plot, rank maxRank -> bottom.
  function yFor(rank: number): number {
    return PAD.top + ((rank - 1) / Math.max(1, maxRank - 1)) * innerH;
  }

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const frac = points.length <= 1 ? 0 : (relX - PAD.left) / innerW;
    const idx = Math.round(frac * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const ticks = Array.from({ length: maxRank }, (_, i) => i + 1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {!hasData && <p className="py-6 text-center text-sm text-slate-400">No entries logged yet.</p>}
      {hasData && (
        <div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${title} rank over time`}>
            {ticks.map((rank) => (
              <g key={rank}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={yFor(rank)}
                  y2={yFor(rank)}
                  stroke={CHART_INK.gridline}
                  strokeWidth={1}
                />
                <text x={PAD.left - 6} y={yFor(rank)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill={CHART_INK.muted}>
                  {rank}
                </text>
              </g>
            ))}

            {points.length === 1 && (
              <text x={xFor(0)} y={HEIGHT - 8} textAnchor="middle" fontSize={9} fill={CHART_INK.muted}>
                {formatDate(points[0].date)}
              </text>
            )}
            {points.length > 1 && (
              <>
                <text x={xFor(0)} y={HEIGHT - 8} textAnchor="start" fontSize={9} fill={CHART_INK.muted}>
                  {formatDate(points[0].date)}
                </text>
                <text x={xFor(points.length - 1)} y={HEIGHT - 8} textAnchor="end" fontSize={9} fill={CHART_INK.muted}>
                  {formatDate(points[points.length - 1].date)}
                </text>
              </>
            )}

            <path
              d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.rank)}`).join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle key={i} cx={xFor(i)} cy={yFor(p.rank)} r={4} fill={color} stroke={CHART_INK.surface} strokeWidth={2} />
            ))}

            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke={CHART_INK.baseline}
                strokeWidth={1}
              />
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
          {hoverIndex !== null && points[hoverIndex] && (
            <p className="mt-1 text-xs text-slate-600">
              {formatDate(points[hoverIndex].date)}: <span className="font-semibold text-slate-800">#{points[hoverIndex].rank}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
