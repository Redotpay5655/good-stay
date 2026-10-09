import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { addDaysISO, todayISO, validateStay } from "@/lib/format";

export function SearchWidget({ initial, compact = false }: { initial?: { checkIn?: string; checkOut?: string; guests?: number }; compact?: boolean }) {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStay(checkIn, checkOut);
    setError(err);
    if (err) return;
    navigate({ to: "/booking", search: { checkIn, checkOut, guests } });
  }

  const field = "min-h-12 w-full rounded-xl border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring";
  return (
    <form onSubmit={submit} noValidate className={`rounded-2xl border bg-card p-4 shadow-[0_20px_60px_-25px_oklch(0.3_0.05_60/0.35)] md:p-5 ${compact ? "" : "md:rounded-3xl"}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.7fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check-in</span>
          <input type="date" className={field} min={todayISO()} value={checkIn}
            onChange={(e) => { setCheckIn(e.target.value); if (!checkOut || checkOut <= e.target.value) setCheckOut(addDaysISO(e.target.value, 1)); }} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check-out</span>
          <input type="date" className={field} min={checkIn ? addDaysISO(checkIn, 1) : addDaysISO(todayISO(), 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guests</span>
          <select className={field} value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
          </select>
        </label>
        <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition hover:brightness-110 sm:col-span-2 lg:col-span-1">
          <Search className="size-4" /> Check Availability
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </form>
  );
}
