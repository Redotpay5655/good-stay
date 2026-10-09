import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_DATES: "Check-out must be after check-in.",
  PAST_DATE: "Check-in can't be in the past.",
  STAY_TOO_LONG: "Stays are limited to 60 nights online. Please contact us.",
  ROOM_UNAVAILABLE: "Sorry, this room isn't available for booking right now.",
  TOO_MANY_GUESTS: "This room can't accommodate that many guests.",
  DATES_UNAVAILABLE: "Sorry — those dates were just taken. Please choose different dates.",
  SERVER_NOT_CONFIGURED: "Online booking isn't set up yet. Please contact us directly.",
};

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  const key = Object.keys(ERROR_MESSAGES).find((k) => msg.includes(k));
  if (!key) console.error("booking error", msg);
  return key ? ERROR_MESSAGES[key] : "Something went wrong. Please try again or contact us.";
}

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const lookup = z.object({ reference: z.string().trim().min(5).max(40), email: z.string().trim().email().max(255) });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      roomId: z.string().uuid(),
      checkIn: iso,
      checkOut: iso,
      guests: z.number().int().min(1).max(30),
      fullName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(255),
      phone: z.string().trim().min(7).max(20).regex(/^[+\d\s-]+$/),
      specialRequests: z.string().trim().max(1000).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { getAdminClient } = await import("./supabase.server");
      const db = getAdminClient();
      const { data: rows, error } = await db.rpc("create_booking", {
        p_room_id: data.roomId, p_check_in: data.checkIn, p_check_out: data.checkOut, p_guests: data.guests,
        p_full_name: data.fullName, p_email: data.email, p_phone: data.phone, p_special_requests: data.specialRequests,
      });
      if (error) throw error;
      const r = (rows as { reference: string; total_amount: number; amount_due_now: number; expires_at: string }[])[0]!;
      return { ok: true as const, reference: r.reference, total: Number(r.total_amount), due: Number(r.amount_due_now), expiresAt: r.expires_at };
    } catch (e) {
      return { ok: false as const, error: friendly(e) };
    }
  });

export const getBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => lookup.parse(d))
  .handler(async ({ data }) => {
    try {
      const { getAdminClient } = await import("./supabase.server");
      const { data: rows, error } = await getAdminClient().rpc("get_booking_public", {
        p_reference: data.reference, p_email: data.email,
      });
      if (error) throw error;
      const b = (rows as Record<string, unknown>[])[0];
      if (!b) return { ok: false as const, error: "We couldn't find a booking with those details." };
      const { getMpesaConfig } = await import("./mpesa.server");
      return { ok: true as const, booking: b as BookingPublic, stkEnabled: Boolean(getMpesaConfig()) };
    } catch (e) {
      return { ok: false as const, error: friendly(e) };
    }
  });

export type BookingPublic = {
  reference: string; status: string; room_name: string; room_slug: string;
  check_in: string; check_out: string; nights: number; guests: number;
  total_amount: number; amount_due_now: number; amount_paid: number; currency: string;
  guest_name: string; expires_at: string | null;
  latest_payment_status: string | null; latest_payment_method: string | null;
};

async function loadPendingBooking(reference: string, email: string) {
  const { getAdminClient } = await import("./supabase.server");
  const db = getAdminClient();
  await db.rpc("release_expired_holds");
  const { data } = await db
    .from("bookings")
    .select("id,reference,status,amount_due_now,amount_paid,currency,booking_guests!inner(email)")
    .eq("reference", reference.toUpperCase())
    .eq("booking_guests.email", email.toLowerCase())
    .maybeSingle();
  return { db, booking: data as null | { id: string; reference: string; status: string; amount_due_now: number; amount_paid: number; currency: string } };
}

export const startMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => lookup.extend({ phone: z.string().trim().min(9).max(16) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { getMpesaConfig, normalizeKenyanPhone, stkPush } = await import("./mpesa.server");
      const cfg = getMpesaConfig();
      if (!cfg) return { ok: false as const, notConfigured: true, error: "Automatic M-Pesa prompts aren't set up yet. Please pay manually below." };
      const phone = normalizeKenyanPhone(data.phone);
      if (!phone) return { ok: false as const, error: "Please enter a valid Safaricom number, e.g. 0712 345 678." };
      const { db, booking } = await loadPendingBooking(data.reference, data.email);
      if (!booking) return { ok: false as const, error: "Booking not found." };
      if (booking.status !== "pending") return { ok: false as const, error: "This booking is no longer awaiting payment." };
      const amount = Math.max(1, Number(booking.amount_due_now) - Number(booking.amount_paid));
      const r = await stkPush(cfg, { phone, amount, accountRef: booking.reference, desc: "Room booking" });
      const { error } = await db.from("payments").insert({
        booking_id: booking.id, method: "mpesa_stk", provider: "mpesa", amount, currency: booking.currency,
        status: "processing", phone, checkout_request_id: r.checkoutRequestId, merchant_request_id: r.merchantRequestId,
      });
      if (error) throw error;
      return { ok: true as const, checkoutRequestId: r.checkoutRequestId };
    } catch (e) {
      console.error("stk error", e instanceof Error ? e.message : e);
      return { ok: false as const, error: "We couldn't send the M-Pesa prompt. Please try again or pay manually below." };
    }
  });

export const checkMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => lookup.extend({ checkoutRequestId: z.string().min(5).max(80) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { db, booking } = await loadPendingBooking(data.reference, data.email);
      if (!booking) return { state: "failed" as const };
      const { data: p } = await db.from("payments").select("id,status")
        .eq("checkout_request_id", data.checkoutRequestId).eq("booking_id", booking.id).maybeSingle();
      if (!p) return { state: "failed" as const };
      if (p.status === "completed") return { state: "completed" as const };
      if (p.status === "failed" || p.status === "cancelled") return { state: "failed" as const };
      const { getMpesaConfig, stkQuery } = await import("./mpesa.server");
      const cfg = getMpesaConfig();
      if (!cfg) return { state: "pending" as const };
      const q = await stkQuery(cfg, data.checkoutRequestId);
      if (q.state === "pending") return { state: "pending" as const };
      // Receipt code arrives via callback; mark status here as authoritative from Daraja query
      await db.from("payments").update({
        status: q.state, result_code: q.code, result_desc: q.desc,
        transaction_date: q.state === "completed" ? new Date().toISOString() : null,
      }).eq("id", p.id).neq("status", "completed");
      if (q.state === "completed") {
        const { sendBookingConfirmation } = await import("./notify.server");
        await sendBookingConfirmation(db, booking.id);
      }
      return { state: q.state };
    } catch {
      return { state: "pending" as const };
    }
  });

export const submitManualPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    lookup.extend({
      receipt: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,12}$/, "Invalid M-Pesa code"),
      phone: z.string().trim().min(9).max(16),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { db, booking } = await loadPendingBooking(data.reference, data.email);
      if (!booking) return { ok: false as const, error: "Booking not found." };
      if (booking.status !== "pending") return { ok: false as const, error: "This booking is no longer awaiting payment." };
      const amount = Math.max(0, Number(booking.amount_due_now) - Number(booking.amount_paid));
      const { error } = await db.from("payments").insert({
        booking_id: booking.id, method: "mpesa_manual", provider: "mpesa", amount, currency: booking.currency,
        status: "awaiting_verification", reference: data.receipt, phone: data.phone,
      });
      if (error) {
        if (error.code === "23505") return { ok: false as const, error: "That M-Pesa code has already been submitted." };
        throw error;
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: friendly(e) };
    }
  });

export const cancelPendingBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => lookup.parse(d))
  .handler(async ({ data }) => {
    const { db, booking } = await loadPendingBooking(data.reference, data.email);
    if (!booking || booking.status !== "pending") return { ok: false as const };
    const { count } = await db.from("payments").select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id).in("status", ["processing", "awaiting_verification", "completed"]);
    if (count) return { ok: false as const };
    await db.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString(), admin_notes: "Cancelled by guest before payment" }).eq("id", booking.id);
    return { ok: true as const };
  });
