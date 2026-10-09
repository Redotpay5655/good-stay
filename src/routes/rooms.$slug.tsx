import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BedDouble, Maximize, Users, Check } from "lucide-react";
import { RoomGallery } from "@/components/site/RoomGallery";
import { AvailabilityCalendar } from "@/components/site/AvailabilityCalendar";
import { EmptyState, ErrorState, Skeleton } from "@/components/site/states";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { useSite } from "@/components/site/use-site";
import { blockedNights, roomQuery, unavailableQuery } from "@/lib/queries";
import { addDaysISO, formatDate, formatMoney, nightsBetween, todayISO, validateStay } from "@/lib/format";

type Search = { checkIn?: string | undefined; checkOut?: string | undefined; guests?: number | undefined; book?: number | undefined };

export const Route = createFileRoute("/rooms/$slug")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    checkIn: typeof s["checkIn"] === "string" ? s["checkIn"] : undefined,
    checkOut: typeof s["checkOut"] === "string" ? s["checkOut"] : undefined,
    guests: s["guests"] ? Number(s["guests"]) || undefined : undefined,
  }),
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — Room details & rates` },
        { name: "description", content: `Photos, amenities, nightly rate and live availability for the ${name}. Book direct and pay with M-Pesa.` },
        { property: "og:title", content: `${name} — Room details & rates` },
        { property: "og:description", content: `Photos, amenities and live availability for the ${name}.` },
      ],
    };
  },
  component: RoomPage,
});

function RoomPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { settings } = useSite();
  const q = useQuery(roomQuery(slug));
  const room = q.data;
  const from = todayISO();
  const un = useQuery({ ...unavailableQuery(room?.id ?? "", from, addDaysISO(from, 365)), enabled: Boolean(room?.id) });
  const [checkIn, setCheckIn] = useState(search.checkIn);
  const [checkOut, setCheckOut] = useState(search.checkOut);
  const [guests, setGuests] = useState(search.guests ?? 2);
  const [err, setErr] = useState<string | null>(null);

  if (q.isLoading) return <div className="mx-auto max-w-6xl px-5 py-10"><Skeleton className="aspect-[16/9] w-full" /><Skeleton className="mt-6 h-10 w-1/2" /></div>;
  if (q.isError) return <div className="py-20"><ErrorState onRetry={() => q.refetch()} /></div>;
  if (!room) return <div className="py-20"><EmptyState title="Room not found" text="This room may no longer be listed." action={<Link to="/rooms" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">View all rooms</Link>} /></div>;

  const blocked = blockedNights(un.data ?? []);
  const nights = nightsBetween(checkIn, checkOut);
  const total = nights * room.price_per_night;
  const amenities = room.room_amenities.map((a) => a.amenities).filter((a): a is NonNullable<typeof a> => Boolean(a));

  function book() {
    const e = validateStay(checkIn, checkOut);
    if (e) return setErr(e);
    if (guests > room!.max_guests) return setErr(`This room sleeps up to ${room!.max_guests}.`);
    navigate({ to: "/booking", search: { checkIn, checkOut, guests, room: room!.slug } });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:py-12">
      <nav className="mb-4 text-sm text-muted-foreground"><Link to="/rooms" className="hover:underline">Rooms</Link> / {room.name}</nav>
      <RoomGallery images={room.room_images} name={room.name} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="eyebrow">{room.room_type}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{room.name}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="size-4" /> Up to {room.max_guests} guests</span>
            {room.bed_type && <span className="flex items-center gap-1.5"><BedDouble className="size-4" /> {room.bed_type}</span>}
            {room.size_sqm && <span className="flex items-center gap-1.5"><Maximize className="size-4" /> {room.size_sqm} m²</span>}
          </div>
          {room.description && <p className="mt-6 whitespace-pre-line leading-relaxed">{room.description}</p>}
          {(amenities.length > 0 || room.facilities.length > 0) && (
            <>
              <h2 className="mt-10 text-2xl">Amenities</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {[...amenities.map((a) => a.name), ...room.facilities].map((n) => (
                  <li key={n} className="flex items-center gap-2 text-sm"><Check className="size-4 text-primary" /> {n}</li>
                ))}
              </ul>
            </>
          )}
          <h2 className="mt-10 text-2xl">Availability</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap your check-in date, then your check-out date.</p>
          <div className="mt-4 max-w-md">
            <AvailabilityCalendar blocked={blocked} checkIn={checkIn} checkOut={checkOut} onChange={(v) => { setCheckIn(v.checkIn); setCheckOut(v.checkOut); setErr(null); }} />
          </div>
          <div className="mt-10 rounded-2xl bg-muted/50 p-5 text-sm">
            <p><strong>Check-in</strong> from {settings.check_in_time} · <strong>Check-out</strong> by {settings.check_out_time}</p>
            {settings.cancellation_policy && <p className="mt-2 text-muted-foreground">{settings.cancellation_policy}</p>}
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <p className="text-3xl font-display">{formatMoney(room.price_per_night, settings.currency)} <span className="text-base text-muted-foreground">/ night</span></p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Check-in</p>{formatDate(checkIn)}</div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Check-out</p>{formatDate(checkOut)}</div>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-xs text-muted-foreground">Guests</span>
              <select className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                {Array.from({ length: room.max_guests }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {nights > 0 && <div className="mt-4 flex justify-between border-t pt-4 text-sm"><span>{formatMoney(room.price_per_night, settings.currency)} × {nights} night{nights > 1 ? "s" : ""}</span><strong>{formatMoney(total, settings.currency)}</strong></div>}
            {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
            <button onClick={book} disabled={!room.is_available} className="mt-5 min-h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-50">
              {room.is_available ? "Book this room" : "Not bookable right now"}
            </button>
            <div className="mt-3 flex justify-center"><WhatsAppButton message={`Hello, I'd like to ask about the ${room.name}.`} label="Ask on WhatsApp" /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
