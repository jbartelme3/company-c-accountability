import type { Cadet } from "../types";
import { formatPosition } from "../types";

function classYearAbbrev(classYear: string | null): string {
  if (!classYear) return "";
  return { Freshman: "Fr", Sophomore: "So", Junior: "Jr", Senior: "Sr" }[classYear] ?? classYear;
}

export default function CadetRow({
  cadet,
  onSelect,
  onAdd,
}: {
  cadet: Cadet;
  onSelect: () => void;
  onAdd: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center justify-between border-t border-slate-100 px-4 py-2.5 text-left text-sm first:border-t-0 hover:bg-slate-50 ${
        cadet.is_cadre ? "bg-blue-50" : ""
      }`}
    >
      <span className={cadet.is_cadre ? "font-medium text-blue-900" : "text-slate-800"}>
        {cadet.last_name}, {cadet.first_name}
      </span>
      <span className="flex items-center gap-3">
        <span className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-xs text-slate-500">
            {classYearAbbrev(cadet.class_year) && `${classYearAbbrev(cadet.class_year)} · `}
            {formatPosition(cadet.position)}
            {cadet.is_cadre ? " · Cadre" : ""}
          </span>
          {!!cadet.negative_count && (
            <span className="text-xs font-semibold text-red-600">
              {cadet.negative_count} flagged {cadet.negative_count === 1 ? "entry" : "entries"}
            </span>
          )}
        </span>
        <button onClick={onAdd} className="text-xs font-medium text-slate-500 hover:text-slate-900">
          Add
        </button>
      </span>
    </div>
  );
}
