import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import type { SiteSettings } from "@/lib/types";
import heroFallback from "@/assets/placeholder-hero.jpg";
import roomFallback from "@/assets/placeholder-room.jpg";
import aboutFallback from "@/assets/placeholder-breakfast.jpg";

export const FALLBACK_IMAGES = { hero: heroFallback, room: roomFallback, about: aboutFallback };

/** Clearly-labelled placeholder values used only until the owner fills in Admin → Settings. */
export const PLACEHOLDER_SETTINGS: SiteSettings = {
  business_name: "[INSERT B&B NAME]",
  tagline: "[Placeholder tagline]",
  hero_headline: "A warm, quiet place to rest",
  hero_description: "[Placeholder description — edit in Admin → Settings.]",
  hero_image_url: null, logo_url: null,
  about_title: "About us", about_text: "[Placeholder about text — edit in Admin → Settings.]", about_image_url: null,
  phone: null, email: null, whatsapp: null,
  address: "[INSERT ADDRESS]", city: "[INSERT LOCATION]", region: null, postal_code: null, country: "Kenya",
  latitude: null, longitude: null, map_embed_url: null, google_maps_url: null,
  facebook_url: null, instagram_url: null, tiktok_url: null,
  check_in_time: "14:00", check_out_time: "10:00",
  cancellation_policy: "[Placeholder cancellation policy]", house_rules: null,
  why_stay: [], deposit_percent: 100, pending_hold_minutes: 30, booking_prefix: "BNB", currency: "KES",
  mpesa_paybill: null, mpesa_account_hint: null, mpesa_till: null, site_url: null, price_range: null,
};

export function useSite() {
  const q = useQuery(settingsQuery);
  const s = { ...PLACEHOLDER_SETTINGS, ...(q.data ?? {}) } as SiteSettings;
  return { settings: s, isLoading: q.isLoading, isError: q.isError };
}
