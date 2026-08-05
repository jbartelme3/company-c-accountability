import type { Cadet } from "../types";
import { formatPosition } from "../types";

export default function CadetRow({ cadet, onSelect }: { cadet: Cadet; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-left text-sm first:border-t-0 hover:bg-slate-50 ${
        cadet.is_cadre ? "bg-blue-50" : ""
      }`}
    >
      <span className={cadet.is_cadre ? "font-medium text-blue-900" : "text-slate-800"}>
        {cadet.last_name}, {cadet.first_name}
      </span>
      <span className="flex flex-col items-end gap-0.5 text-right">
        <span className="text-xs text-slate-500">
          {formatPosition(cadet.position)}
          {cadet.is_cadre ? " · Cadre" : ""}
        </span>
        {!!cadet.negative_count && (
          <span className="text-xs font-semibold text-red-600">
            {cadet.negative_count} flagged {cadet.negative_count === 1 ? "entry" : "entries"}
          </span>
        )}
      </span>
    </button>
  );
}
