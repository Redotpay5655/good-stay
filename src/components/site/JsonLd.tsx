import type { SiteSettings } from "@/lib/types";

/** LodgingBusiness / BedAndBreakfast schema built from editable site settings. */
export function BusinessJsonLd({ s, url }: { s: SiteSettings; url?: string }) {
  if (s.business_name.startsWith("[")) return null; // don't publish placeholder data
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BedAndBreakfast",
    name: s.business_name,
    description: s.hero_description ?? undefined,
    url: s.site_url ?? url,
    image: s.hero_image_url ?? undefined,
    logo: s.logo_url ?? undefined,
    telephone: s.phone ?? undefined,
    email: s.email ?? undefined,
    priceRange: s.price_range ?? undefined,
    currenciesAccepted: s.currency,
    paymentAccepted: "M-Pesa",
    checkinTime: s.check_in_time ?? undefined,
    checkoutTime: s.check_out_time ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address ?? undefined,
      addressLocality: s.city ?? undefined,
      addressRegion: s.region ?? undefined,
      postalCode: s.postal_code ?? undefined,
      addressCountry: "KE",
    },
    hasMap: s.google_maps_url ?? undefined,
    sameAs: [s.facebook_url, s.instagram_url, s.tiktok_url, s.google_maps_url].filter(Boolean),
  };
  if (s.latitude && s.longitude) data['geo'] = { "@type": "GeoCoordinates", latitude: s.latitude, longitude: s.longitude };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
