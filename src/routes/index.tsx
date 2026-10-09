import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, MapPin, Quote, Star } from "lucide-react";
import { useSite, FALLBACK_IMAGES } from "@/components/site/use-site";
import { SearchWidget } from "@/components/site/SearchWidget";
import { RoomCard } from "@/components/site/RoomCard";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { BusinessJsonLd } from "@/components/site/JsonLd";
import { EmptyState, ErrorState, Skeleton } from "@/components/site/states";
import { amenitiesQuery, galleryQuery, roomsQuery, testimonialsQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bed & Breakfast in Kenya — Book Your Stay Direct" },
      { name: "description", content: "A boutique bed & breakfast in Kenya. Comfortable, spotless rooms, warm hospitality and easy M-Pesa booking. Check availability and book direct." },
      { property: "og:title", content: "Bed & Breakfast in Kenya — Book Your Stay Direct" },
      { property: "og:description", content: "Comfortable rooms, warm hospitality and easy M-Pesa booking. Check availability and book direct." },
    ],
  }),
  component: Home,
});

const DEFAULT_WHY = [
  { title: "Spotlessly clean", text: "Fresh linen and carefully prepared rooms for every stay." },
  { title: "Safe & secure", text: "A calm, secure property so you can truly switch off." },
  { title: "Warm hospitality", text: "Personal, attentive hosting — the reason guests come back." },
  { title: "Easy booking", text: "Book direct online and pay securely with M-Pesa." },
];

function Home() {
  const { settings: s } = useSite();
  const rooms = useQuery(roomsQuery);
  const amenities = useQuery(amenitiesQuery);
  const gallery = useQuery(galleryQuery);
  const testimonials = useQuery(testimonialsQuery);
  const featured = (rooms.data ?? []).filter((r) => r.is_featured);
  const showRooms = (featured.length ? featured : rooms.data ?? []).slice(0, 3);
  const why = s.why_stay?.length ? s.why_stay : DEFAULT_WHY;
  const propertyAmenities = (amenities.data ?? []).filter((a) => a.show_on_home);

  return (
    <>
      <BusinessJsonLd s={s} />
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[78svh] min-h-[520px] overflow-hidden md:h-[86vh]">
          <img src={s.hero_image_url || FALLBACK_IMAGES.hero} alt={s.business_name} width={1920} height={1088} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/25 to-foreground/10" />
          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-28 md:px-8 md:pb-36">
            <p className="fade-up eyebrow !text-background/85">{s.business_name} · {s.city}</p>
            <h1 className="fade-up mt-4 max-w-3xl text-5xl leading-[1.02] text-background md:text-7xl">{s.hero_headline}</h1>
            <p className="fade-up mt-5 max-w-xl text-base text-background/85 md:text-lg">{s.hero_description}</p>
            <div className="fade-up mt-8 flex flex-wrap gap-3">
              <Link to="/booking" className="inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-lg hover:brightness-110">Book Your Stay</Link>
              <Link to="/rooms" className="inline-flex min-h-12 items-center rounded-full border border-background/50 bg-background/10 px-7 font-semibold text-background backdrop-blur hover:bg-background/20">View Rooms</Link>
            </div>
          </div>
        </div>
        <div className="relative mx-auto -mt-16 max-w-5xl px-5 md:-mt-14">
          <SearchWidget />
        </div>
      </section>

      {/* Featured rooms */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Stay with us</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Our rooms</h2>
          </div>
          <Link to="/rooms" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">View all rooms →</Link>
        </div>
        <div className="mt-10">
          {rooms.isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[440px]" />)}</div>
          ) : rooms.isError ? (
            <ErrorState onRetry={() => rooms.refetch()} />
          ) : showRooms.length === 0 ? (
            <EmptyState title="Rooms coming soon" text="Our rooms are being prepared. Contact us directly to ask about a stay." action={<Link to="/contact" className="inline-flex min-h-11 items-center rounded-full border px-6 text-sm font-semibold">Contact Us</Link>} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{showRooms.map((r) => <RoomCard key={r.id} room={r} currency={s.currency} />)}</div>
          )}
        </div>
      </section>

      {/* Why stay */}
      <section className="bg-sand">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:px-8 md:py-28">
          <div className="relative">
            <img src={s.about_image_url || FALLBACK_IMAGES.about} alt="Guest experience" loading="lazy" width={1280} height={960} className="aspect-[4/5] w-full rounded-3xl object-cover md:aspect-[4/5]" />
          </div>
          <div>
            <p className="eyebrow">Why stay with us</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Affordable comfort, thoughtfully hosted</h2>
            <dl className="mt-10 grid gap-8 sm:grid-cols-2">
              {why.map((w) => (
                <div key={w.title}>
                  <dt className="font-display text-xl">{w.title}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{w.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Amenities */}
      {propertyAmenities.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <p className="eyebrow">Amenities</p>
          <h2 className="mt-3 text-4xl">Everything you need</h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            {propertyAmenities.map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-b pb-4 text-sm"><Check className="size-4 text-primary" />{a.name}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Gallery preview */}
      {(gallery.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="flex items-end justify-between">
            <h2 className="text-4xl">A look around</h2>
            <Link to="/gallery" className="text-sm font-semibold text-primary hover:underline">Full gallery →</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-4">
            {gallery.data!.slice(0, 8).map((g, i) => (
              <img key={g.id} src={g.url} alt={g.caption ?? "Gallery photo"} loading="lazy" className={`size-full rounded-xl object-cover ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`} />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {(testimonials.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <p className="eyebrow">Guest stories</p>
          <h2 className="mt-3 text-4xl">What our guests say</h2>
          <div className="-mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {testimonials.data!.map((t) => (
              <figure key={t.id} className="w-[85%] shrink-0 snap-center rounded-2xl border bg-card p-6 md:w-auto">
                <Quote className="size-6 text-primary/40" />
                <div className="mt-3 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < t.rating ? "fill-primary text-primary" : "text-border"}`} />)}
                </div>
                <blockquote className="mt-4 font-display text-lg leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm text-muted-foreground">{t.guest_name}{t.guest_location ? ` · ${t.guest_location}` : ""}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Location */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid overflow-hidden rounded-3xl border bg-card md:grid-cols-2">
          <div className="p-8 md:p-12">
            <p className="eyebrow">Location</p>
            <h2 className="mt-3 text-4xl">Find us</h2>
            <p className="mt-4 flex gap-2 text-muted-foreground"><MapPin className="mt-1 size-4 shrink-0" />{[s.address, s.city, s.country].filter(Boolean).join(", ")}</p>
            <p className="mt-4 text-sm text-muted-foreground">Check-in from {s.check_in_time} · Check-out by {s.check_out_time}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {s.google_maps_url && <a href={s.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold hover:bg-secondary">Get directions</a>}
              <Link to="/contact" className="inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold hover:bg-secondary">Contact Us</Link>
              <WhatsAppButton />
            </div>
          </div>
          {s.map_embed_url ? (
            <iframe title="Map" src={s.map_embed_url} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="min-h-[320px] w-full border-0" />
          ) : (
            <div className="flex min-h-[260px] items-center justify-center bg-muted p-8 text-center text-sm text-muted-foreground">Map will appear here once a Google Maps embed link is added in Admin → Settings.</div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:py-20">
          <h2 className="text-4xl md:text-5xl">Ready when you are</h2>
          <p className="mx-auto mt-4 max-w-lg opacity-90">Choose your dates, pick your room and confirm instantly with M-Pesa.</p>
          <Link to="/booking" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-background px-8 font-semibold text-foreground hover:bg-background/90">Check Availability</Link>
        </div>
      </section>
    </>
  );
}
