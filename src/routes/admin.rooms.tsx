import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { requireClient } from "@/lib/supabase";
import { uploadImage } from "@/lib/admin-upload";
import type { Room } from "@/lib/types";

export const Route = createFileRoute("/admin/rooms")({ component: Rooms });

const empty = { slug: "", name: "", room_type: "Double", short_description: "", description: "", price_per_night: 0, max_guests: 2, bed_type: "", size_sqm: null as number | null, facilities: [] as string[], is_active: true, is_available: true, is_featured: false, sort_order: 0 };
type Draft = typeof empty & { id?: string };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Rooms() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await requireClient().from("rooms").select("*,room_images(id,url,alt,sort_order),room_amenities(amenities(id,name,icon,scope,show_on_home,sort_order))").order("sort_order");
      if (error) throw error;
      return data as unknown as Room[];
    },
  });
  const [edit, setEdit] = useState<Draft | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-rooms"] }); qc.invalidateQueries({ queryKey: ["rooms"] }); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { id, ...rest } = edit;
    const row = { ...rest, slug: rest.slug || slugify(rest.name), bed_type: rest.bed_type || null };
    const db = requireClient();
    const { error } = id ? await db.from("rooms").update(row).eq("id", id) : await db.from("rooms").insert(row);
    if (error) return void toast.error(error.message);
    toast.success("Room saved"); setEdit(null); refresh();
  }
  async function addPhotos(room: Room, files: FileList | null) {
    if (!files) return;
    try {
      for (const [i, f] of Array.from(files).entries()) {
        const url = await uploadImage(f, `rooms/${room.id}`);
        await requireClient().from("room_images").insert({ room_id: room.id, url, alt: room.name, sort_order: room.room_images.length + i });
      }
      toast.success("Photos added"); refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }
  async function delPhoto(id: string) { await requireClient().from("room_images").delete().eq("id", id); refresh(); }
  async function del(r: Room) {
    if (!confirm(`Delete ${r.name}? Rooms with bookings can only be hidden.`)) return;
    const { error } = await requireClient().from("rooms").delete().eq("id", r.id);
    if (error) { await requireClient().from("rooms").update({ is_active: false }).eq("id", r.id); toast.message("Room has bookings, so it was hidden instead."); }
    refresh();
  }

  const f = "mt-1 min-h-10 w-full rounded-xl border bg-background px-3 text-sm";
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-3xl">Rooms</h1><button onClick={() => setEdit({ ...empty })} className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Add room</button></div>
      {edit && (
        <form onSubmit={save} className="mt-6 grid gap-3 rounded-2xl border bg-card p-5 text-sm md:grid-cols-2">
          <label>Name<input required className={f} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          <label>Web address (slug)<input className={f} placeholder={slugify(edit.name)} value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></label>
          <label>Type<input required className={f} value={edit.room_type} onChange={(e) => setEdit({ ...edit, room_type: e.target.value })} /></label>
          <label>Price per night (KES)<input required type="number" min={0} className={f} value={edit.price_per_night} onChange={(e) => setEdit({ ...edit, price_per_night: Number(e.target.value) })} /></label>
          <label>Max guests<input required type="number" min={1} className={f} value={edit.max_guests} onChange={(e) => setEdit({ ...edit, max_guests: Number(e.target.value) })} /></label>
          <label>Bed type<input className={f} value={edit.bed_type ?? ""} onChange={(e) => setEdit({ ...edit, bed_type: e.target.value })} /></label>
          <label>Size (m²)<input type="number" className={f} value={edit.size_sqm ?? ""} onChange={(e) => setEdit({ ...edit, size_sqm: e.target.value ? Number(e.target.value) : null })} /></label>
          <label>Display order<input type="number" className={f} value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} /></label>
          <label className="md:col-span-2">Short description<input className={f} value={edit.short_description ?? ""} onChange={(e) => setEdit({ ...edit, short_description: e.target.value })} /></label>
          <label className="md:col-span-2">Full description<textarea rows={4} className={`${f} py-2`} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
          <label className="md:col-span-2">Facilities (comma separated)<input className={f} value={edit.facilities.join(", ")} onChange={(e) => setEdit({ ...edit, facilities: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
          <div className="flex flex-wrap gap-4 md:col-span-2">
            {(["is_active", "is_available", "is_featured"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} />{{ is_active: "Shown on site", is_available: "Bookable", is_featured: "Featured on home" }[k]}</label>
            ))}
          </div>
          <div className="flex gap-2 md:col-span-2"><button className="min-h-10 rounded-full bg-primary px-5 font-semibold text-primary-foreground">Save</button><button type="button" onClick={() => setEdit(null)} className="min-h-10 rounded-full border px-5">Cancel</button></div>
        </form>
      )}
      <div className="mt-6 space-y-4">
        {q.isLoading && <p>Loading…</p>}
        {q.data?.length === 0 && <p className="text-muted-foreground">No rooms yet — add your first room.</p>}
        {q.data?.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <strong className="text-base">{r.name}</strong><span>KES {r.price_per_night.toLocaleString()}</span><span>sleeps {r.max_guests}</span>
              {!r.is_active && <span className="rounded-full bg-muted px-2 text-xs">Hidden</span>}
              {!r.is_available && <span className="rounded-full bg-muted px-2 text-xs">Not bookable</span>}
              <div className="ml-auto flex gap-2">
                <button onClick={() => setEdit({ ...empty, ...r, short_description: r.short_description ?? "", description: r.description ?? "", bed_type: r.bed_type ?? "" })} className="rounded-full border px-3 py-1">Edit</button>
                <button onClick={() => del(r)} className="rounded-full border px-3 py-1 text-destructive">Delete</button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...r.room_images].sort((a, b) => a.sort_order - b.sort_order).map((img) => (
                <div key={img.id} className="relative"><img src={img.url} alt="" className="size-20 rounded-lg object-cover" /><button onClick={() => delPhoto(img.id)} aria-label="Remove photo" className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">×</button></div>
              ))}
              <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">+ Photos<input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(r, e.target.files)} /></label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
