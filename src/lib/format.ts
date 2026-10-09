export function formatMoney(amount: number | null | undefined, currency = "KES") {
  const n = Number(amount ?? 0);
  return `${currency} ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDaysISO(s: string, n: number) {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function nightsBetween(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0;
  const ms = parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return parseISODate(s).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function validateStay(checkIn?: string, checkOut?: string): string | null {
  if (!isDate(checkIn) || !isDate(checkOut)) return "Please choose your check-in and check-out dates.";
  if (checkIn < todayISO()) return "Check-in can't be in the past.";
  if (checkOut <= checkIn) return "Check-out must be after check-in.";
  if (nightsBetween(checkIn, checkOut) > 60) return "Stays are limited to 60 nights online. Please contact us.";
  return null;
}

/** Digits-only international number for wa.me links. Kenyan local 07.. → 2547.. */
export function normalizeWhatsApp(raw: string | null | undefined) {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "254" + d.slice(1);
  return d.length >= 9 ? d : null;
}

export function whatsappLink(raw: string | null | undefined, message?: string) {
  const n = normalizeWhatsApp(raw);
  if (!n) return null;
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No show",
};
