import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useSite } from "@/components/site/use-site";
import { Skeleton } from "@/components/site/states";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { formatDate, formatMoney, STATUS_LABEL } from "@/lib/format";
import { cancelPendingBooking, checkMpesaPayment, getBooking, startMpesaPayment, submitManualPayment, type BookingPublic } from "@/lib/booking.functions";

type Search = { ref: string; email: string };

export const Route = createFileRoute("/booking/pay")({
  validateSearch: (s: Record<string, unknown>): Search => ({ ref: String(s["ref"] ?? ""), email: String(s["email"] ?? "") }),
  head: () => ({
    meta: [
      { title: "Your booking — Payment & status" },
      { name: "description", content: "Pay for your booking with M-Pesa and check its status." },
      { property: "og:title", content: "Your booking — Payment & status" },
      { property: "og:description", content: "Pay with M-Pesa and check your booking status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const { ref, email } = Route.useSearch();
  const { settings } = useSite();
  const [b, setB] = useState<BookingPublic | null>(null);
  const [stk, setStk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const r = await getBooking({ data: { reference: ref, email } }).catch(() => ({ ok: false as const, error: "Network error." }));
    if (r.ok) { setB(r.booking); setStk(r.stkEnabled); setErr(null); } else setErr(r.error ?? null);
    setLoading(false);
  }, [ref, email]);
  useEffect(() => { if (ref && email) load(); else { setLoading(false); setErr("Missing booking details."); } }, [load, ref, email]);

  if (loading) return <div className="mx-auto max-w-2xl px-5 py-14"><Skeleton className="h-64" /></div>;
  if (err || !b) return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-3xl">Booking not found</h1>
      <p className="mt-3 text-muted-foreground">{err}</p>
      <Link to="/booking/manage" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Look up a booking</Link>
    </div>
  );

  const balance = Math.max(0, Number(b.amount_due_now) - Number(b.amount_paid));
  const awaiting = b.latest_payment_status === "awaiting_verification";
  const icon = b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out"
    ? <CheckCircle2 className="size-12 text-primary" /> : b.status === "pending" ? <Clock className="size-12 text-accent-foreground" /> : <XCircle className="size-12 text-destructive" />;
  const headline = b.status === "confirmed" ? "Your booking is confirmed" : b.status === "pending" ? (awaiting ? "Payment received — verifying" : "Complete your payment") : b.status === "cancelled" ? "This booking was cancelled" : STATUS_LABEL[b.status] ?? b.status;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:py-14">
      <div className="text-center">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 text-3xl md:text-4xl">{headline}</h1>
        <p className="mt-2 text-muted-foreground">Reference <strong className="text-foreground">{b.reference}</strong> — keep this for your records.</p>
      </div>
      <div className="mt-8 rounded-2xl border bg-card p-5 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted-foreground">Room</p>{b.room_name}</div>
          <div><p className="text-xs text-muted-foreground">Guests</p>{b.guests}</div>
          <div><p className="text-xs text-muted-foreground">Check-in</p>{formatDate(b.check_in)}</div>
          <div><p className="text-xs text-muted-foreground">Check-out</p>{formatDate(b.check_out)}</div>
        </div>
        <div className="mt-4 space-y-1 border-t pt-4">
          <div className="flex justify-between"><span>Total ({b.nights} nights)</span><span>{formatMoney(b.total_amount, b.currency)}</span></div>
          <div className="flex justify-between"><span>Paid</span><span>{formatMoney(b.amount_paid, b.currency)}</span></div>
          {b.status === "pending" && <div className="flex justify-between font-semibold"><span>Due now</span><span>{formatMoney(balance, b.currency)}</span></div>}
        </div>
      </div>

      {b.status === "pending" && awaiting && <p className="mt-6 rounded-2xl bg-muted/50 p-5 text-sm">We've received your M-Pesa code and will confirm your booking shortly. You'll get an email once it's verified.</p>}
      {b.status === "pending" && !awaiting && balance > 0 && <PaymentPanel b={b} email={email} balance={balance} stk={stk} onDone={load} paybill={settings.mpesa_paybill} till={settings.mpesa_till} hint={settings.mpesa_account_hint} />}
      {b.status === "pending" && b.expires_at && !awaiting && <p className="mt-4 text-center text-xs text-muted-foreground">Room held until {new Date(b.expires_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}.</p>}
      {b.status === "confirmed" && <p className="mt-6 text-center text-sm text-muted-foreground">A confirmation has been sent to {email}. Check-in from {settings.check_in_time}.</p>}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex min-h-11 items-center rounded-full border px-6 text-sm font-semibold">Back to home</Link>
        <WhatsAppButton message={`Hello, about my booking ${b.reference}`} label="Contact us on WhatsApp" />
      </div>
      {b.status === "pending" && !awaiting && b.latest_payment_status !== "processing" && <CancelButton reference={b.reference} email={email} onDone={load} />}
    </div>
  );
}

function PaymentPanel({ b, email, balance, stk, onDone, paybill, till, hint }: { b: BookingPublic; email: string; balance: number; stk: boolean; onDone: () => void; paybill: string | null; till: string | null; hint: string | null }) {
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [receipt, setReceipt] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const r = await checkMpesaPayment({ data: { reference: b.reference, email, checkoutRequestId: waiting } }).catch(() => ({ state: "pending" as const }));
      if (r.state === "completed") { clearInterval(t); setWaiting(null); onDone(); }
      else if (r.state === "failed") { clearInterval(t); setWaiting(null); setMsg("The payment wasn't completed. You can try again or pay manually."); }
      else if (n > 24) { clearInterval(t); setWaiting(null); setMsg("Still waiting for M-Pesa. If you paid, refresh this page in a minute."); }
    }, 5000);
    return () => clearInterval(t);
  }, [waiting, b.reference, email, onDone]);

  async function sendStk(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await startMpesaPayment({ data: { reference: b.reference, email, phone } }).catch(() => ({ ok: false as const, error: "Network error." }));
    setBusy(false);
    if (r.ok) setWaiting(r.checkoutRequestId); else setMsg(r.error ?? null);
  }
  async function manual(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await submitManualPayment({ data: { reference: b.reference, email, receipt, phone: manualPhone } }).catch(() => ({ ok: false as const, error: "Please check the M-Pesa code and phone number." }));
    setBusy(false);
    if (r.ok) onDone(); else setMsg(r.error ?? null);
  }
  const field = "min-h-12 w-full rounded-xl border bg-background px-3 text-base";

  return (
    <div className="mt-6 space-y-6">
      {stk && (
        <form onSubmit={sendStk} className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl">Pay with M-Pesa</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll send a payment prompt of {formatMoney(balance, b.currency)} to your phone. Enter your M-Pesa PIN to complete.</p>
          {waiting ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium"><Clock className="size-4 animate-pulse" /> Check your phone and enter your PIN…</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input type="tel" inputMode="tel" placeholder="0712 345 678" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <button disabled={busy} className="min-h-12 shrink-0 rounded-full bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Sending…" : "Send prompt"}</button>
            </div>
          )}
        </form>
      )}
      {(paybill || till) && (
        <form onSubmit={manual} className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl">{stk ? "Or pay manually" : "Pay with M-Pesa"}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open M-Pesa → Lipa na M-Pesa → {till ? <>Buy Goods, Till <strong className="text-foreground">{till}</strong></> : <>Pay Bill, Business no. <strong className="text-foreground">{paybill}</strong>, Account <strong className="text-foreground">{b.reference}</strong></>}</li>
            <li>Amount: <strong className="text-foreground">{formatMoney(balance, b.currency)}</strong></li>
            <li>Enter the M-Pesa confirmation code below.</li>
          </ol>
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input placeholder="M-Pesa code e.g. SGH7XY12AB" className={`${field} uppercase`} value={receipt} onChange={(e) => setReceipt(e.target.value)} required />
            <input type="tel" placeholder="Phone you paid from" className={field} value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} required />
          </div>
          <button disabled={busy} className="mt-3 min-h-12 w-full rounded-full border border-primary font-semibold text-primary disabled:opacity-50">Submit payment code</button>
        </form>
      )}
      {!stk && !paybill && !till && <p className="rounded-2xl bg-muted/50 p-5 text-sm">Online payment isn't set up yet. Please contact us to arrange payment for booking <strong>{b.reference}</strong>.</p>}
      {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}

function CancelButton({ reference, email, onDone }: { reference: string; email: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-6 text-center">
      <button disabled={busy} onClick={async () => { if (!confirm("Cancel this booking and release the room?")) return; setBusy(true); await cancelPendingBooking({ data: { reference, email } }).catch(() => null); setBusy(false); onDone(); }}
        className="text-sm text-muted-foreground underline">Cancel this booking</button>
    </div>
  );
}
