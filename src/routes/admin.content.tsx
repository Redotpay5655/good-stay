import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { requireClient } from "@/lib/supabase";
import { uploadImage } from "@/lib/admin-upload";

export const Route = createFileRoute("/admin/content")({ component: Content });

function Content() {
  const qc = useQueryClient();
  const gallery = useQuery({ queryKey: ["admin-gallery"], queryFn: async () => (await requireClient().from("gallery").select("*").order("sort_order")).data ?? [] });
  const reviews = useQuery({ queryKey: ["admin-reviews"], queryFn: async () => (await requireClient().from("testimonials").select("*").order("sort_order")).data ?? [] });
  const [category, setCategory] = useState("General");
  const [t, setT] = useState({ guest_name: "", guest_location: "", quote: "", rating: 5 });
  const refresh = () => { ["admin-gallery", "admin-reviews", "gallery", "testimonials"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };

  async function upload(files: FileList | null) {
    if (!files) return;
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file, "gallery");
        await requireClient().from("gallery").insert({ url, category, sort_order: gallery.data?.length ?? 0 });
      }
      toast.success("Uploaded"); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
  }
  async function addReview(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await requireClient().from("testimonials").insert({ ...t, guest_location: t.guest_location || null });
    if (error) return void toast.error(error.message);
    setT({ guest_name: "", guest_location: "", quote: "", rating: 5 }); refresh();
  }
  const f = "mt-1 min-h-10 w-full rounded-xl border bg-background px-3 text-sm";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl">Gallery</h1>
        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <label>Category<input className={f} value={category} onChange={(e) => setCategory(e.target.value)} /></label>
          <label className="min-h-10 cursor-pointer rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Upload photos<input type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} /></label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.data?.map((g) => (
            <div key={g.id} className="rounded-xl border bg-card p-2 text-xs">
              <img src={g.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <input className="mt-2 w-full rounded border px-2 py-1" placeholder="Caption" defaultValue={g.caption ?? ""} onBlur={async (e) => { await requireClient().from("gallery").update({ caption: e.target.value || null }).eq("id", g.id); refresh(); }} />
              <div className="mt-1 flex justify-between"><span>{g.category}</span><button onClick={async () => { await requireClient().from("gallery").delete().eq("id", g.id); refresh(); }} className="text-destructive underline">Delete</button></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-3xl">Guest reviews</h2>
        <form onSubmit={addReview} className="mt-4 grid gap-3 rounded-2xl border bg-card p-5 text-sm md:grid-cols-3">
          <label>Guest name<input required className={f} value={t.guest_name} onChange={(e) => setT({ ...t, guest_name: e.target.value })} /></label>
          <label>From (optional)<input className={f} value={t.guest_location} onChange={(e) => setT({ ...t, guest_location: e.target.value })} /></label>
          <label>Rating<select className={f} value={t.rating} onChange={(e) => setT({ ...t, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label className="md:col-span-3">Review<textarea required maxLength={1200} rows={3} className={`${f} py-2`} value={t.quote} onChange={(e) => setT({ ...t, quote: e.target.value })} /></label>
          <button className="min-h-10 rounded-full bg-primary font-semibold text-primary-foreground md:w-40">Add review</button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {reviews.data?.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <span>“{r.quote}” — <strong>{r.guest_name}</strong> ({r.rating}★)</span>
              <label className="ml-auto flex items-center gap-1"><input type="checkbox" checked={r.is_published} onChange={async (e) => { await requireClient().from("testimonials").update({ is_published: e.target.checked }).eq("id", r.id); refresh(); }} /> Shown</label>
              <button onClick={async () => { await requireClient().from("testimonials").delete().eq("id", r.id); refresh(); }} className="text-destructive underline">Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
