import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useSite } from "@/components/site/use-site";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact us — Directions, phone & WhatsApp" },
      { name: "description", content: "Call, email or WhatsApp us, and find directions to our bed & breakfast." },
      { property: "og:title", content: "Contact us — Directions, phone & WhatsApp" },
      { property: "og:description", content: "Call, email or WhatsApp us and get directions." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { settings: s } = useSite();
  const addr = [s.address, s.city, s.region, s.country].filter(Boolean).join(", ");
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-2 text-4xl md:text-5xl">We'd love to host you</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <ul className="space-y-5">
          <li className="flex gap-3"><MapPin className="mt-0.5 size-5 text-primary" /><div><p className="font-semibold">Address</p><p className="text-muted-foreground">{addr}</p>{s.google_maps_url && <a href={s.google_maps_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Get directions</a>}</div></li>
          {s.phone && <li className="flex gap-3"><Phone className="mt-0.5 size-5 text-primary" /><div><p className="font-semibold">Phone</p><a href={`tel:${s.phone}`} className="text-muted-foreground hover:underline">{s.phone}</a></div></li>}
          {s.email && <li className="flex gap-3"><Mail className="mt-0.5 size-5 text-primary" /><div><p className="font-semibold">Email</p><a href={`mailto:${s.email}`} className="text-muted-foreground hover:underline">{s.email}</a></div></li>}
          <li><WhatsAppButton message="Hello, I'd like to ask about a stay." label="Chat on WhatsApp" /></li>
          {!s.phone && !s.email && !s.whatsapp && <li className="text-sm text-muted-foreground">Contact details will appear here once added in the admin settings.</li>}
        </ul>
        {s.map_embed_url ? (
          <iframe title="Map" src={s.map_embed_url} className="aspect-square w-full rounded-3xl border" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-3xl border bg-muted/40 text-sm text-muted-foreground">Map coming soon</div>
        )}
      </div>
    </div>
  );
}
