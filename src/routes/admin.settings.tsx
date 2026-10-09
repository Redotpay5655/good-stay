import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { requireClient } from "@/lib/supabase";
import { uploadImage } from "@/lib/admin-upload";
import { PLACEHOLDER_SETTINGS } from "@/components/site/use-site";
import type { SiteSettings } from "@/lib/types";

export const Route = createFileRoute("/admin/settings")({ component: Settings });

type K = keyof SiteSettings;
const groups: { title: string; fields: [K, string, ("text" | "textarea" | "number" | "image")?][] }[] = [
  { title: "Business", fields: [["business_name", "Business name"], ["tagline", "Tagline"], ["logo_url", "Logo", "image"], ["site_url", "Website address (https://…)"], ["price_range", "Price range (e.g. KES 5,000–12,000)"]] },
  { title: "Home page", fields: [["hero_headline", "Headline"], ["hero_description", "Intro text", "textarea"], ["hero_image_url", "Main photo", "image"]] },
  { title: "About", fields: [["about_title", "Title"], ["about_text", "Text", "textarea"], ["about_image_url", "Photo", "image"], ["house_rules", "House rules", "textarea"]] },
  { title: "Contact & location", fields: [["phone", "Phone"], ["email", "Email"], ["whatsapp", "WhatsApp number"], ["address", "Address"], ["city", "Town / city"], ["region", "County"], ["country", "Country"], ["google_maps_url", "Google Maps link"], ["map_embed_url", "Google Maps embed URL"], ["facebook_url", "Facebook"], ["instagram_url", "Instagram"], ["tiktok_url", "TikTok"]] },
  { title: "Booking & payment", fields: [["check_in_time", "Check-in time"], ["check_out_time", "Check-out time"], ["cancellation_policy", "Cancellation policy", "textarea"], ["deposit_percent", "Deposit due at booking (%)", "number"], ["pending_hold_minutes", "Hold unpaid bookings for (minutes)", "number"], ["booking_prefix", "Booking reference prefix"], ["mpesa_paybill", "M-Pesa Paybill number"], ["mpesa_till", "M-Pesa Till number (instead of Paybill)"], ["mpesa_account_hint", "Payment note shown to guests"]] },
];

function Settings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await requireClient().from("site_settings").select("*").eq("id", 1).maybeSingle()).data as SiteSettings | null });
  const [s, setS] = useState<SiteSettings>(PLACEHOLDER_SETTINGS);
  const [why, setWhy] = useState("");
  useEffect(() => { if (q.data) { setS(q.data); setWhy((q.data.why_stay ?? []).map((w) => `${w.title} | ${w.text}`).join("\n")); } }, [q.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const why_stay = why.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter(([a]) => a).map(([title, text]) => ({ title: title!, text: text ?? "" }));
    const { error } = await requireClient().from("site_settings").update({ ...s, why_stay }).eq("id", 1);
    if (error) return void toast.error(error.message);
    toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["site_settings"] }); qc.invalidateQueries({ queryKey: ["admin-settings"] });
  }
  const f = "mt-1 min-h-10 w-full rounded-xl border bg-background px-3 text-sm";
  if (q.isLoading) return <p>Loading…</p>;

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl">Settings</h1><button className="min-h-10 rounded-full bg-primary px-6 font-semibold text-primary-foreground">Save changes</button></div>
      {groups.map((g) => (
        <fieldset key={g.title} className="grid gap-3 rounded-2xl border bg-card p-5 text-sm md:grid-cols-2">
          <legend className="px-1 font-display text-xl">{g.title}</legend>
          {g.fields.map(([k, label, type]) => {
            const v = (s[k] ?? "") as string | number;
            const set = (val: unknown) => setS({ ...s, [k]: val });
            if (type === "textarea") return <label key={k} className="md:col-span-2">{label}<textarea rows={3} className={`${f} py-2`} value={v} onChange={(e) => set(e.target.value || null)} /></label>;
            if (type === "number") return <label key={k}>{label}<input type="number" min={0} className={f} value={v} onChange={(e) => set(Number(e.target.value))} /></label>;
            if (type === "image") return (
              <label key={k}>{label}
                <div className="mt-1 flex items-center gap-3">
                  {v ? <img src={String(v)} alt="" className="size-14 rounded-lg object-cover" /> : <span className="text-xs text-muted-foreground">None</span>}
                  <input type="file" accept="image/*" className="text-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { set(await uploadImage(file, "site")); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); } }} />
                  {v && <button type="button" onClick={() => set(null)} className="text-xs underline">Remove</button>}
                </div>
              </label>
            );
            return <label key={k}>{label}<input className={f} value={v} onChange={(e) => set(e.target.value || null)} /></label>;
          })}
        </fieldset>
      ))}
      <fieldset className="rounded-2xl border bg-card p-5 text-sm">
        <legend className="px-1 font-display text-xl">Why stay with us</legend>
        <p className="text-muted-foreground">One per line: Title | Short text</p>
        <textarea rows={4} className={`${f} py-2`} value={why} onChange={(e) => setWhy(e.target.value)} />
      </fieldset>
    </form>
  );
}
