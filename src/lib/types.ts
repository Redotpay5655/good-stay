export type SiteSettings = {
  business_name: string;
  tagline: string | null;
  hero_headline: string | null;
  hero_description: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  about_title: string | null;
  about_text: string | null;
  about_image_url: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  map_embed_url: string | null;
  google_maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  cancellation_policy: string | null;
  house_rules: string | null;
  why_stay: { title: string; text: string }[];
  deposit_percent: number;
  pending_hold_minutes: number;
  booking_prefix: string;
  currency: string;
  mpesa_paybill: string | null;
  mpesa_account_hint: string | null;
  mpesa_till: string | null;
  site_url: string | null;
  price_range: string | null;
};

export type RoomImage = { id: string; url: string; alt: string | null; sort_order: number };
export type Amenity = {
  id: string;
  name: string;
  icon: string | null;
  scope: "room" | "property" | "both";
  show_on_home: boolean;
  sort_order: number;
};

export type Room = {
  id: string;
  slug: string;
  name: string;
  room_type: string;
  short_description: string | null;
  description: string | null;
  price_per_night: number;
  max_guests: number;
  bed_type: string | null;
  size_sqm: number | null;
  facilities: string[];
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  room_images: RoomImage[];
  room_amenities: { amenities: Amenity | null }[];
};

export type Testimonial = {
  id: string;
  guest_name: string;
  guest_location: string | null;
  quote: string;
  rating: number;
};

export type GalleryItem = {
  id: string;
  url: string;
  caption: string | null;
  category: string | null;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";
