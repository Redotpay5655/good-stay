import { MessageCircle } from "lucide-react";
import { useSite } from "./use-site";
import { whatsappLink } from "@/lib/format";

/** Renders nothing when no WhatsApp number is saved in settings (no dead buttons). */
export function WhatsAppButton({ message, label = "WhatsApp", className = "" }: { message?: string; label?: string; className?: string }) {
  const { settings } = useSite();
  const href = whatsappLink(settings.whatsapp, message ?? `Hello ${settings.business_name}, I'd like to ask about a stay.`);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-success/40 px-5 text-sm font-semibold text-success hover:bg-success/10 ${className}`}>
      <MessageCircle className="size-4" /> {label}
    </a>
  );
}

export function WhatsAppFab() {
  const { settings } = useSite();
  const href = whatsappLink(settings.whatsapp, `Hello ${settings.business_name}, I'd like to ask about a stay.`);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-success text-primary-foreground shadow-lg transition hover:scale-105">
      <MessageCircle className="size-6" />
    </a>
  );
}
