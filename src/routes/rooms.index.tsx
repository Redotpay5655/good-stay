import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BedDouble } from "lucide-react";
import { RoomCard } from "@/components/site/RoomCard";
import { EmptyState, ErrorState, Skeleton } from "@/components/site/states";
import { useSite } from "@/components/site/use-site";
import { availableRoomIdsQuery, roomsQuery } from "@/lib/queries";
import { addDaysISO, todayISO, validateStay } from "@/lib/format";

export const Route = createFileRoute("/rooms/")({
  head: () => ({
    meta: [
      { title: "Rooms & Rates — Bed & Breakfast in Kenya" },
      { name: "description", content: "Browse our guest rooms, nightly rates in KES, occupancy and amenities. Check availability and book your room direct." },
      { property: "og:title", content: "Rooms & Rates — Bed & Breakfast in Kenya" },
      { property: "og:description", content: "Browse rooms, nightly rates and amenities. Check availability and book direct." },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const { settings } = useSite();
  const rooms = useQuery(roomsQuery);
  const [guests, setGuests] = useState(1);
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [type, setType] = useState("all");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const datesValid = Boolean(checkIn && checkOut) && !validateStay(checkIn, checkOut);
  const avail = useQuery({ ...availableRoomIdsQuery(checkIn, checkOut, 1), enabled: datesValid });
  const types = useMemo(() => Array.from(new Set((rooms.data ?? []).map((r) => r.room_type))), [rooms.data]);

  const list = (rooms.data ?? []).filter((r) =>
    r.max_guests >= guests && (maxPrice === "" || r.price_per_night <= maxPrice) && (type === "all" || r.room_type === type),
  );
  const field = "min-h-11 w-full rounded-xl border bg-background px-3 text-base";

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <p className="eyebrow">Accommodation</p>
      <h1 className="mt-3 text-5xl md:text-6xl">Rooms & rates</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">All prices are per room, per night in {settings.currency}.</p>

      <div className="mt-10 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check-in
          <input type="date" min={todayISO()} className={`${field} mt-1`} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (!checkOut || checkOut <= e.target.value) setCheckOut(addDaysISO(e.target.value, 1)); }} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check-out
          <input type="date" min={checkIn ? addDaysISO(checkIn, 1) : todayISO()} className={`${field} mt-1`} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guests
          <select className={`${field} mt-1`} value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max price / night
          <input type="number" inputMode="numeric" min={0} placeholder="Any" className={`${field} mt-1`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Room type
          <select className={`${field} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {checkIn && checkOut && !datesValid && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-5">{validateStay(checkIn, checkOut)}</p>}
      </div>

      <div className="mt-10">
        {rooms.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[460px]" />)}</div>
        ) : rooms.isError ? (
          <ErrorState onRetry={() => rooms.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState icon={<BedDouble className="size-5" />} title="No rooms match your filters" text="Try fewer guests, a higher price or a different room type." action={<Link to="/contact" className="inline-flex min-h-11 items-center rounded-full border px-6 text-sm font-semibold">Contact Us</Link>} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <RoomCard key={r.id} room={r} currency={settings.currency}
                availability={datesValid && avail.data ? (avail.data.includes(r.id) ? "available" : "unavailable") : null}
                search={datesValid ? { checkIn, checkOut, guests } : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
