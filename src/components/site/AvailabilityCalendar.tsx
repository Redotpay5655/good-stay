import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toISODate, todayISO } from "@/lib/format";

/**
 * Month grid. Clicking selects check-in then check-out. Nights in `blocked`
 * can't be part of a stay (a blocked night may still be used as check-out day).
 */
export function AvailabilityCalendar({ blocked, checkIn, checkOut, onChange }: {
  blocked: Set<string>; checkIn?: string | undefined; checkOut?: string | undefined;
  onChange: (v: { checkIn?: string; checkOut?: string | undefined }) => void;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const today = todayISO();
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => toISODate(new Date(year, month, i + 1)))];

  function rangeFree(a: string, b: string) {
    const d = new Date(a + "T00:00:00");
    const end = new Date(b + "T00:00:00");
    while (d < end) { if (blocked.has(toISODate(d))) return false; d.setDate(d.getDate() + 1); }
    return true;
  }

  function pick(day: string) {
    if (!checkIn || (checkIn && checkOut) || day <= checkIn) {
      if (blocked.has(day)) return;
      onChange({ checkIn: day });
    } else if (rangeFree(checkIn, day)) {
      onChange({ checkIn, checkOut: day });
    } else {
      if (!blocked.has(day)) onChange({ checkIn: day });
    }
  }

  const canPrev = new Date(year, month, 1) > new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex size-10 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30" aria-label="Previous month"><ChevronLeft className="size-4" /></button>
        <p className="font-display text-lg">{cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex size-10 items-center justify-center rounded-full hover:bg-secondary" aria-label="Next month"><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today;
          const isBlocked = blocked.has(d);
          const selected = d === checkIn || d === checkOut;
          const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
          return (
            <button key={d} type="button" disabled={past} onClick={() => pick(d)}
              aria-label={`${d}${isBlocked ? " unavailable" : ""}`}
              className={`aspect-square rounded-lg text-sm transition
                ${past ? "text-muted-foreground/40" : ""}
                ${isBlocked && !past ? "bg-muted text-muted-foreground line-through" : ""}
                ${inRange ? "bg-primary/15" : ""}
                ${selected ? "bg-primary font-semibold text-primary-foreground" : !past && !isBlocked ? "hover:bg-secondary" : ""}`}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-muted" /> Unavailable</span>
      </div>
    </div>
  );
}
