import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useSite } from "./use-site";
import { whatsappLink } from "@/lib/format";

export function SiteFooter() {
  const { settings: s } = useSite();
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to ask about a stay.`);
  const socials = [
    ["Facebook", s.facebook_url],
    ["Instagram", s.instagram_url],
    ["TikTok", s.tiktok_url],
  ].filter(([, u]) => u) as [string, string][];
  return (
    <footer className="bg-forest text-forest-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-3xl">{s.business_name}</p>
          {s.tagline && <p className="mt-3 max-w-sm text-sm opacity-75">{s.tagline}</p>}
          <Link to="/booking" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
            Check Availability
          </Link>
        </div>
        <div>
          <p className="eyebrow !text-forest-foreground/60">Visit</p>
          <ul className="mt-4 space-y-3 text-sm opacity-85">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{[s.address, s.city, s.country].filter(Boolean).join(", ")}</li>
            {s.phone && <li><a className="flex gap-2 hover:underline" href={`tel:${s.phone}`}><Phone className="size-4" />{s.phone}</a></li>}
            {s.email && <li><a className="flex gap-2 hover:underline" href={`mailto:${s.email}`}><Mail className="size-4" />{s.email}</a></li>}
            {wa && <li><a className="hover:underline" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>}
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-forest-foreground/60">Explore</p>
          <ul className="mt-4 space-y-2 text-sm opacity-85">
            <li><Link to="/rooms" className="hover:underline">Rooms</Link></li>
            <li><Link to="/gallery" className="hover:underline">Gallery</Link></li>
            <li><Link to="/about" className="hover:underline">About</Link></li>
            <li><Link to="/contact" className="hover:underline">Contact</Link></li>
            <li><Link to="/booking/manage" className="hover:underline">Find my booking</Link></li>
            {socials.map(([n, u]) => (
              <li key={n}><a href={u} target="_blank" rel="noopener noreferrer" className="hover:underline">{n}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-foreground/10 px-5 py-6 text-center text-xs opacity-60">
        © {new Date().getFullYear()} {s.business_name}. Check-in {s.check_in_time} · Check-out {s.check_out_time}
      </div>
    </footer>
  );
}
