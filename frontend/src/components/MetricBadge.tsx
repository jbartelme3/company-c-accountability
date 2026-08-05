import type { MetricType } from "../types";
import { METRIC_POLARITY } from "../types";

const STYLES = {
  positive: "bg-green-100 text-green-800 border-green-300",
  neutral: "bg-slate-100 text-slate-700 border-slate-300",
  negative: "bg-red-100 text-red-800 border-red-300",
};

export default function MetricBadge({ type, count }: { type: MetricType; count: number }) {
  const polarity = METRIC_POLARITY[type];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[polarity]}`}>
      {count}
    </span>
  );
}
