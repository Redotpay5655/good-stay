import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { requireClient } from "@/lib/supabase";
import { formatDate, formatMoney, STATUS_LABEL, todayISO } from "@/lib/format";

export const Route = createFileRoute("/admin/")({ component: Bookings });

type Row = {
  id: string; reference: string; check_in: string; check_out: string; nights: number; guests: number; status: string;
  total_amount: number; amount_paid: number; amount_due_now: number; currency: string; admin_notes: string | null; created_at: string;
  rooms: { name: string } | null;
  booking_guests: { full_name: string; email: string; phone: string; special_requests: string | null } | null;
  payments: { id: string; method: string; amount: number; status: string; reference: string | null; phone: string | null; created_at: string }[];
};

function Bookings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await requireClient().from("bookings")
        .select("id,reference,check_in,check_out,nights,guests,status,total_amount,amount_paid,amount_due_now,currency,admin_notes,created_at,rooms(name),booking_guests(full_name,email,phone,special_requests),payments(id,method,amount,status,reference,phone,created_at)")
        .order("check_in", { ascending: false }).limit(500);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const today = todayISO();
  const rows = (q.data ?? []).filter((b) => {
    if (search && !`${b.reference} ${b.booking_guests?.full_name} ${b.booking_guests?.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "upcoming") return b.check_out >= today && ["pending", "confirmed", "checked_in"].includes(b.status);
    if (filter === "verify") return b.payments.some((p) => p.status === "awaiting_verification");
    return filter === "all" || b.status === filter;
  });
  const stats = {
    arrivals: (q.data ?? []).filter((b) => b.check_in === today && b.status === "confirmed").length,
    inHouse: (q.data ?? []).filter((b) => b.status === "checked_in").length,
    verify: (q.data ?? []).filter((b) => b.payments.some((p) => p.status === "awaiting_verification")).length,
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-bookings"] });

  async function setStatus(b: Row, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "confirmed") patch["confirmed_at"] = new Date().toISOString();
    if (status === "cancelled") patch["cancelled_at"] = new Date().toISOString();
    const { error } = await requireClient().from("bookings").update(patch).eq("id", b.id);
    error ? toast.error(error.message) : toast.success(`Marked ${STATUS_LABEL[status]}`);
    refresh();
  }
  async function verify(pid: string, ok: boolean) {
    const { data: u } = await requireClient().auth.getUser();
    const { error } = await requireClient().from("payments").update({ status: ok ? "completed" : "failed", verified_by: u.user?.id, transaction_date: ok ? new Date().toISOString() : null }).eq("id", pid);
    error ? toast.error(error.message) : toast.success(ok ? "Payment approved" : "Payment rejected");
    refresh();
  }

  return (
    <div>
      <h1 className="text-3xl">Bookings</h1>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[["Arriving today", stats.arrivals], ["In house", stats.inHouse], ["Payments to verify", stats.verify]].map(([l, n]) => (
          <div key={l} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{n}</p></div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <input placeholder="Search name, ref, phone" className="min-h-10 rounded-xl border bg-background px-3 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="min-h-10 rounded-xl border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="upcoming">Upcoming</option><option value="verify">Needs verification</option><option value="all">All</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {q.isLoading ? <p className="mt-6">Loading…</p> : q.isError ? <p className="mt-6 text-destructive">Couldn't load bookings.</p> : rows.length === 0 ? <p className="mt-6 text-muted-foreground">No bookings here.</p> : (
        <div className="mt-5 space-y-3">
          {rows.map((b) => (
            <details key={b.id} className="rounded-2xl border bg-card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <strong>{b.reference}</strong><span>{b.booking_guests?.full_name}</span><span>{b.rooms?.name}</span>
                <span>{formatDate(b.check_in)} → {formatDate(b.check_out)}</span>
                <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs">{STATUS_LABEL[b.status]}</span>
              </summary>
              <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <p>{b.booking_guests?.email} · <a className="underline" href={`tel:${b.booking_guests?.phone}`}>{b.booking_guests?.phone}</a></p>
                  <p>{b.guests} guests · {b.nights} nights</p>
                  <p>Total {formatMoney(b.total_amount, b.currency)} · Paid {formatMoney(b.amount_paid, b.currency)}</p>
                  {b.booking_guests?.special_requests && <p className="mt-2 text-muted-foreground">“{b.booking_guests.special_requests}”</p>}
                  {b.admin_notes && <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{b.admin_notes}</p>}
                </div>
                <div>
                  <p className="font-semibold">Payments</p>
                  {b.payments.length === 0 && <p className="text-muted-foreground">None yet</p>}
                  {b.payments.map((p) => (
                    <div key={p.id} className="mt-1 flex flex-wrap items-center gap-2">
                      <span>{p.method} · {formatMoney(p.amount, b.currency)} · {p.reference ?? "—"} · {p.status}</span>
                      {p.status === "awaiting_verification" && <>
                        <button onClick={() => verify(p.id, true)} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Approve</button>
                        <button onClick={() => verify(p.id, false)} className="rounded-full border px-3 py-1 text-xs">Reject</button>
                      </>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {b.status === "pending" && <Btn onClick={() => setStatus(b, "confirmed")}>Confirm</Btn>}
                {b.status === "confirmed" && <Btn onClick={() => setStatus(b, "checked_in")}>Check in</Btn>}
                {b.status === "confirmed" && <Btn onClick={() => setStatus(b, "no_show")}>No show</Btn>}
                {b.status === "checked_in" && <Btn onClick={() => setStatus(b, "checked_out")}>Check out</Btn>}
                {["pending", "confirmed"].includes(b.status) && <Btn onClick={() => confirm("Cancel this booking?") && setStatus(b, "cancelled")}>Cancel</Btn>}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="min-h-9 rounded-full border px-4 text-xs font-semibold hover:bg-muted">{children}</button>;
}
