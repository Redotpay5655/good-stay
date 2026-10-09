import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { SearchWidget } from "@/components/site/SearchWidget";
import { EmptyState, ErrorState, Skeleton } from "@/components/site/states";
import { useSite, FALLBACK_IMAGES } from "@/components/site/use-site";
import { availableRoomIdsQuery, roomsQuery } from "@/lib/queries";
import { formatDate, formatMoney, nightsBetween, validateStay } from "@/lib/format";
import { createBooking } from "@/lib/booking.functions";
import type { Room } from "@/lib/types";

type Search = { checkIn?: string | undefined; checkOut?: string | undefined; guests?: number | undefined; room?: string | undefined };

export const Route = createFileRoute("/booking/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    checkIn: typeof s["checkIn"] === "string" ? s["checkIn"] : undefined,
    checkOut: typeof s["checkOut"] === "string" ? s["checkOut"] : undefined,
    guests: s["guests"] ? Number(s["guests"]) || undefined : undefined,
    room: typeof s["room"] === "string" ? s["room"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book your stay — Check availability" },
      { name: "description", content: "Choose your dates, pick an available room and book direct. Secure your stay with M-Pesa." },
      { property: "og:title", content: "Book your stay — Check availability" },
      { property: "og:description", content: "Choose dates, pick a room and book direct with M-Pesa." },
    ],
  }),
  component: BookingPage,
});

const guestSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(9, "Please enter a valid phone number").max(20).regex(/^[+\d\s-]+$/, "Digits only, e.g. 0712 345 678"),
  specialRequests: z.string().trim().max(1000).optional().default(""),
});

function Steps({ step }: { step: number }) {
  const labels = ["Dates", "Room", "Your details", "Review"];
  return (
    <ol className="mb-8 flex gap-2 text-xs font-semibold">
      {labels.map((l, i) => (
        <li key={l} className={`flex-1 border-t-2 pt-2 ${i <= step ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>{i + 1}. {l}</li>
      ))}
    </ol>
  );
}

function BookingPage() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const { settings } = useSite();
  const datesErr = validateStay(s.checkIn, s.checkOut);
  const guests = s["guests"] ?? 2;
  const rooms = useQuery(roomsQuery);
  const avail = useQuery({ ...availableRoomIdsQuery(s["checkIn"] ?? "", s["checkOut"] ?? "", guests), enabled: !datesErr });
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", specialRequests: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const nights = nightsBetween(s.checkIn, s.checkOut);
  const selected: Room | undefined = s["room"] ? rooms.data?.find((r) => r.slug === s.room) : undefined;
  const step = datesErr ? 0 : !selected ? 1 : reviewing ? 3 : 2;
  const wrap = (c: React.ReactNode) => <div className="mx-auto max-w-4xl px-5 py-10 md:py-14"><h1 className="mb-6 text-4xl">Book your stay</h1><Steps step={step} />{c}</div>;

  if (datesErr) return wrap(<><p className="mb-4 text-muted-foreground">Choose your dates and number of guests to see available rooms.</p><SearchWidget initial={s} compact /></>);

  const summary = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/50 p-4 text-sm">
      <span>{formatDate(s.checkIn)} → {formatDate(s.checkOut)} · {nights} night{nights > 1 ? "s" : ""} · {guests} guest{guests > 1 ? "s" : ""}</span>
      <Link to="/booking" search={{ guests }} className="font-semibold text-primary underline">Change dates</Link>
    </div>
  );

  if (!selected) {
    if (rooms.isLoading || avail.isLoading) return wrap(<>{summary}<div className="grid gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /></div></>);
    if (rooms.isError || avail.isError) return wrap(<ErrorState onRetry={() => { rooms.refetch(); avail.refetch(); }} />);
    const ids = new Set(avail.data ?? []);
    const list = (rooms.data ?? []).filter((r) => ids.has(r.id));
    return wrap(<>
      {summary}
      {list.length === 0 ? (
        <EmptyState title="No rooms free for those dates" text="Try different dates or fewer guests, or contact us — we may be able to help." action={<Link to="/contact" className="inline-flex min-h-11 items-center rounded-full border px-6 text-sm font-semibold">Contact us</Link>} />
      ) : (
        <div className="grid gap-4">
          {list.map((r) => (
            <div key={r.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card sm:flex-row">
              <img src={r.room_images[0]?.url ?? FALLBACK_IMAGES.room} alt={r.room_images[0]?.alt ?? r.name} className="h-44 w-full object-cover sm:h-auto sm:w-56" loading="lazy" />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h2 className="text-2xl">{r.name}</h2>
                <p className="text-sm text-muted-foreground">{r.short_description}</p>
                <p className="text-sm text-muted-foreground">Sleeps {r.max_guests}{r.bed_type ? ` · ${r.bed_type}` : ""}</p>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
                  <div><p className="font-semibold">{formatMoney(r.price_per_night * nights, settings.currency)}</p><p className="text-xs text-muted-foreground">{formatMoney(r.price_per_night, settings.currency)} / night</p></div>
                  <button onClick={() => navigate({ to: "/booking", search: { ...s, room: r.slug } })} className="min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Select room</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>);
  }

  const total = selected.price_per_night * nights;
  const due = Math.round((total * settings.deposit_percent) / 100);

  function next(e: React.FormEvent) {
    e.preventDefault();
    const r = guestSchema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setReviewing(true);
    window.scrollTo({ top: 0 });
  }

  async function confirm() {
    setSubmitting(true); setSubmitErr(null);
    const res = await createBooking({ data: { roomId: selected!.id, checkIn: s.checkIn!, checkOut: s.checkOut!, guests, ...form } }).catch(() => ({ ok: false as const, error: "Network error. Please try again." }));
    setSubmitting(false);
    if (!res.ok) return setSubmitErr(res.error ?? null);
    navigate({ to: "/booking/pay", search: { ref: res.reference, email: form.email.trim() } });
  }

  const field = "mt-1 min-h-12 w-full rounded-xl border bg-background px-3 text-base";
  const priceBox = (
    <div className="rounded-2xl border bg-card p-5 text-sm">
      <p className="font-semibold">{selected.name}</p>
      <p className="mt-1 text-muted-foreground">{formatDate(s.checkIn)} → {formatDate(s.checkOut)}</p>
      <div className="mt-4 flex justify-between"><span>{formatMoney(selected.price_per_night, settings.currency)} × {nights}</span><span>{formatMoney(total, settings.currency)}</span></div>
      <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatMoney(total, settings.currency)}</span></div>
      {due < total && <div className="mt-1 flex justify-between text-primary"><span>Due now ({settings.deposit_percent}% deposit)</span><span>{formatMoney(due, settings.currency)}</span></div>}
    </div>
  );

  if (!reviewing) return wrap(<>
    {summary}
    <div className="grid gap-8 md:grid-cols-[1fr_300px]">
      <form onSubmit={next} noValidate className="grid gap-4">
        {([["fullName", "Full name", "text", "name"], ["email", "Email", "email", "email"], ["phone", "Phone (M-Pesa number)", "tel", "tel"]] as const).map(([k, l, t, ac]) => (
          <label key={k} className="block text-sm font-medium">{l}
            <input type={t} autoComplete={ac} className={field} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={Boolean(errors[k])} />
            {errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>}
          </label>
        ))}
        <label className="block text-sm font-medium">Special requests (optional)
          <textarea rows={3} maxLength={1000} className={`${field} py-2`} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
        </label>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate({ to: "/booking", search: { ...s, room: undefined } })} className="min-h-12 rounded-full border px-6 text-sm font-semibold">Back</button>
          <button type="submit" className="min-h-12 flex-1 rounded-full bg-primary font-semibold text-primary-foreground">Review booking</button>
        </div>
      </form>
      {priceBox}
    </div>
  </>);

  return wrap(<div className="grid gap-8 md:grid-cols-[1fr_300px]">
    <div className="space-y-4 text-sm">
      <div className="rounded-2xl border p-5">
        <p className="font-semibold">Guest</p>
        <p className="mt-1">{form.fullName}<br />{form.email}<br />{form.phone}</p>
        {form.specialRequests && <p className="mt-2 text-muted-foreground">“{form.specialRequests}”</p>}
      </div>
      <div className="rounded-2xl bg-muted/50 p-5">
        <p>Check-in from {settings.check_in_time} · Check-out by {settings.check_out_time}</p>
        {settings.cancellation_policy && <p className="mt-2 text-muted-foreground">{settings.cancellation_policy}</p>}
        <p className="mt-2 text-muted-foreground">Your room is held for {settings.pending_hold_minutes} minutes while you pay.</p>
      </div>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the booking and cancellation policy.</label>
      {submitErr && <p role="alert" className="text-destructive">{submitErr}</p>}
      <div className="flex gap-3">
        <button onClick={() => setReviewing(false)} className="min-h-12 rounded-full border px-6 font-semibold">Edit</button>
        <button onClick={confirm} disabled={!agree || submitting} className="min-h-12 flex-1 rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-50">{submitting ? "Reserving…" : "Confirm & continue to payment"}</button>
      </div>
    </div>
    {priceBox}
  </div>);
}
