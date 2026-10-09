// Notification layer. Channels are pluggable: email is implemented (Resend),
// WhatsApp/SMS can be added by implementing another sender with the same input.
import type { SupabaseClient } from "@supabase/supabase-js";

type BookingForNotice = {
  id: string;
  reference: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_amount: number;
  amount_paid: number;
  currency: string;
  rooms: { name: string } | null;
  booking_guests: { full_name: string; email: string; phone: string } | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendBookingConfirmation(db: SupabaseClient, bookingId: string) {
  const { data: b } = await db
    .from("bookings")
    .select("id,reference,check_in,check_out,guests,total_amount,amount_paid,currency,rooms(name),booking_guests(full_name,email,phone)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;
  const booking = b as unknown as BookingForNotice;
  const { data: s } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const guest = booking.booking_guests;
  if (!guest) return;

  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'];
  const log = (status: string, error?: string) =>
    db.from("notifications_log").insert({
      booking_id: booking.id, channel: "email", template: "booking_confirmation",
      recipient: guest.email, status, error: error ?? null,
    });

  if (!apiKey || !from) {
    await log("skipped", "Email provider not configured (RESEND_API_KEY / EMAIL_FROM)");
    return;
  }

  const name = s?.business_name ?? "Our B&B";
  const money = (n: number) => `${booking.currency} ${Number(n).toLocaleString("en-KE")}`;
  const balance = Math.max(0, Number(booking.total_amount) - Number(booking.amount_paid));
  const rows: [string, string][] = [
    ["Booking reference", booking.reference],
    ["Room", booking.rooms?.name ?? ""],
    ["Check-in", `${booking.check_in}${s?.check_in_time ? ` from ${s.check_in_time}` : ""}`],
    ["Check-out", `${booking.check_out}${s?.check_out_time ? ` by ${s.check_out_time}` : ""}`],
    ["Guests", String(booking.guests)],
    ["Amount paid", money(booking.amount_paid)],
    ["Remaining balance", money(balance)],
  ];
  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#3a2f25">
  <h1 style="font-weight:400">${esc(name)}</h1>
  <p>Dear ${esc(guest.full_name)},</p>
  <p>Thank you — your stay is confirmed. We look forward to welcoming you.</p>
  <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
  ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#7a6a5a;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join("")}
  </table>
  <p style="font-family:Arial,sans-serif;font-size:14px">${esc(s?.address ?? "")}${s?.city ? `, ${esc(s.city)}` : ""}<br/>
  ${s?.phone ? `Phone: ${esc(s.phone)}<br/>` : ""}${s?.email ? `Email: ${esc(s.email)}<br/>` : ""}
  ${s?.google_maps_url ? `<a href="${esc(s.google_maps_url)}">Open in Google Maps</a>` : ""}</p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [guest.email], reply_to: s?.email || undefined,
        subject: `Booking confirmed — ${booking.reference} · ${name}`, html,
      }),
    });
    if (!res.ok) await log("failed", `HTTP ${res.status}`);
    else await log("sent");
  } catch (e) {
    await log("failed", e instanceof Error ? e.message : "unknown");
  }
}
