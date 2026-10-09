import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { requireClient } from "@/lib/supabase";
import { addDaysISO, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/admin/calendar")({ component: Blocks });

function Blocks() {
  const qc = useQueryClient();
  const rooms = useQuery({ queryKey: ["admin-room-names"], queryFn: async () => (await requireClient().from("rooms").select("id,name").order("sort_order")).data ?? [] });
  const blocks = useQuery({
    queryKey: ["admin-blocks"],
    queryFn: async () => (await requireClient().from("availability_blocks").select("id,room_id,start_date,end_date,reason,rooms(name)").gte("end_date", todayISO()).order("start_date")).data as unknown as { id: string; start_date: string; end_date: string; reason: string | null; rooms: { name: string } | null }[] ?? [],
  });
  const [form, setForm] = useState({ room_id: "", start_date: todayISO(), last_night: todayISO(), reason: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (form.last_night < form.start_date) return void toast.error("End date must be on or after start date.");
    const { error } = await requireClient().from("availability_blocks").insert({ room_id: form.room_id, start_date: form.start_date, end_date: addDaysISO(form.last_night, 1), reason: form.reason || null });
    if (error) return void toast.error(error.message);
    toast.success("Dates blocked"); qc.invalidateQueries({ queryKey: ["admin-blocks"] });
  }
  async function del(id: string) { await requireClient().from("availability_blocks").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-blocks"] }); }
  const f = "mt-1 min-h-10 w-full rounded-xl border bg-background px-3 text-sm";

  return (
    <div>
      <h1 className="text-3xl">Blocked dates</h1>
      <p className="mt-1 text-sm text-muted-foreground">Close a room for maintenance, private use or bookings taken elsewhere.</p>
      <form onSubmit={add} className="mt-6 grid gap-3 rounded-2xl border bg-card p-5 text-sm md:grid-cols-5 md:items-end">
        <label>Room<select required className={f} value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}><option value="">Choose…</option>{rooms.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label>First night<input type="date" required className={f} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
        <label>Last night<input type="date" required className={f} value={form.last_night} onChange={(e) => setForm({ ...form, last_night: e.target.value })} /></label>
        <label>Reason<input className={f} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
        <button className="min-h-10 rounded-full bg-primary font-semibold text-primary-foreground">Block</button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {blocks.data?.length === 0 && <li className="text-muted-foreground">No upcoming blocks.</li>}
        {blocks.data?.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
            <strong>{b.rooms?.name}</strong><span>{formatDate(b.start_date)} – {formatDate(addDaysISO(b.end_date, -1))}</span><span className="text-muted-foreground">{b.reason}</span>
            <button onClick={() => del(b.id)} className="ml-auto underline">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
