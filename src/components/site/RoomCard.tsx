import { Link } from "@tanstack/react-router";
import { BedDouble, Users } from "lucide-react";
import type { Room } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { FALLBACK_IMAGES } from "./use-site";

export function RoomCard({ room, currency = "KES", availability, search }: {
  room: Room; currency?: string; availability?: "available" | "unavailable" | null;
  search?: { checkIn?: string; checkOut?: string; guests?: number } | undefined;
}) {
  const img = room.room_images[0];
  const amenities = room.room_amenities.map((a) => a.amenities).filter(Boolean).slice(0, 4);
  const bookable = room.is_available && availability !== "unavailable";
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-xl">
      <Link to="/rooms/$slug" params={{ slug: room.slug }} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        <img src={img?.url ?? FALLBACK_IMAGES.room} alt={img?.alt ?? room.name} loading="lazy" width={800} height={600}
          className="size-full object-cover transition duration-700 group-hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${bookable ? "bg-background/85 text-success" : "bg-background/85 text-destructive"}`}>
          {!room.is_available ? "Currently unavailable" : availability === "unavailable" ? "Booked for your dates" : availability === "available" ? "Available for your dates" : "Available"}
        </span>
        {!img && <span className="absolute bottom-3 right-3 rounded bg-foreground/60 px-2 py-0.5 text-[10px] text-background">Placeholder photo</span>}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{room.room_type}</p>
        <h3 className="mt-1 text-2xl">{room.name}</h3>
        {room.short_description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{room.short_description}</p>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users className="size-4" /> Up to {room.max_guests}</span>
          {room.bed_type && <span className="flex items-center gap-1.5"><BedDouble className="size-4" /> {room.bed_type}</span>}
        </div>
        {amenities.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {amenities.map((a) => <li key={a!.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{a!.name}</li>)}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p><span className="font-display text-2xl">{formatMoney(room.price_per_night, currency)}</span><span className="text-sm text-muted-foreground"> / night</span></p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/rooms/$slug" params={{ slug: room.slug }} search={search ?? {}} className="flex min-h-11 items-center justify-center rounded-full border text-sm font-semibold hover:bg-secondary">
            View Room
          </Link>
          {bookable ? (
            <Link to="/rooms/$slug" params={{ slug: room.slug }} search={{ ...search, book: 1 }} className="flex min-h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110">
              Book Now
            </Link>
          ) : (
            <span className="flex min-h-11 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">Unavailable</span>
          )}
        </div>
      </div>
    </article>
  );
}
