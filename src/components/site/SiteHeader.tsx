import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useSite } from "./use-site";

const NAV = [
  { to: "/rooms", label: "Rooms" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { settings } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled || open ? "border-b bg-background/90 backdrop-blur-md" : "bg-background/60 backdrop-blur-sm"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-8">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.business_name} className="h-9 w-auto" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
              {settings.business_name.replace(/[^A-Za-z]/g, "").charAt(0) || "B"}
            </span>
          )}
          <span className="font-display text-lg leading-tight md:text-xl">{settings.business_name}</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-foreground/75 transition-colors hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }}>
              {n.label}
            </Link>
          ))}
          <Link to="/booking" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
            Book Your Stay
          </Link>
        </nav>
        <button className="-mr-2 flex size-11 items-center justify-center md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="fade-up h-[calc(100dvh-4rem)] border-t bg-background px-5 py-6 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {[{ to: "/", label: "Home" } as const, ...NAV].map((n) => (
              <li key={n.to}>
                <Link to={n.to} onClick={() => setOpen(false)} className="block py-3 font-display text-3xl">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/booking" onClick={() => setOpen(false)} className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
            Book Your Stay
          </Link>
        </nav>
      )}
    </header>
  );
}
