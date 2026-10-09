import { queryOptions } from "@tanstack/react-query";
import { requireClient, isSupabaseConfigured } from "./supabase";
import { toISODate } from "./format";
import type { GalleryItem, Room, SiteSettings, Testimonial, Amenity } from "./types";

const ROOM_SELECT =
  "id,slug,name,room_type,short_description,description,price_per_night,max_guests,bed_type,size_sqm,facilities,is_active,is_available,is_featured,sort_order,room_images(id,url,alt,sort_order),room_amenities(amenities(id,name,icon,scope,show_on_home,sort_order))";

function sortImages(r: Room): Room {
  return { ...r, room_images: [...(r.room_images ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
}

export const settingsQuery = queryOptions({
  queryKey: ["site_settings"],
  enabled: isSupabaseConfigured,
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<SiteSettings | null> => {
    const { data, error } = await requireClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data as SiteSettings | null;
  },
});

export const roomsQuery = queryOptions({
  queryKey: ["rooms"],
  enabled: isSupabaseConfigured,
  staleTime: 60_000,
  queryFn: async (): Promise<Room[]> => {
    const { data, error } = await requireClient()
      .from("rooms")
      .select(ROOM_SELECT)
      .eq("is_active", true)
      .order("sort_order")
      .order("price_per_night");
    if (error) throw error;
    return ((data ?? []) as unknown as Room[]).map(sortImages);
  },
});

export const roomQuery = (slug: string) =>
  queryOptions({
    queryKey: ["room", slug],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<Room | null> => {
      const { data, error } = await requireClient()
        .from("rooms")
        .select(ROOM_SELECT)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data ? sortImages(data as unknown as Room) : null;
    },
  });

export const availableRoomIdsQuery = (checkIn: string, checkOut: string, guests: number) =>
  queryOptions({
    queryKey: ["available", checkIn, checkOut, guests],
    enabled: isSupabaseConfigured && Boolean(checkIn && checkOut),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await requireClient().rpc("get_available_room_ids", {
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_guests: guests,
      });
      if (error) throw error;
      return ((data ?? []) as unknown[]).map((x) =>
        typeof x === "string" ? x : (Object.values(x as object)[0] as string),
      );
    },
  });

export const unavailableQuery = (roomId: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["unavailable", roomId, from, to],
    enabled: isSupabaseConfigured && Boolean(roomId),
    queryFn: async (): Promise<{ start_date: string; end_date: string }[]> => {
      const { data, error } = await requireClient().rpc("get_room_unavailable", {
        p_room_id: roomId,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      return (data ?? []) as { start_date: string; end_date: string }[];
    },
  });

export const testimonialsQuery = queryOptions({
  queryKey: ["testimonials"],
  enabled: isSupabaseConfigured,
  queryFn: async (): Promise<Testimonial[]> => {
    const { data, error } = await requireClient()
      .from("testimonials")
      .select("id,guest_name,guest_location,quote,rating")
      .eq("is_published", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Testimonial[];
  },
});

export const galleryQuery = queryOptions({
  queryKey: ["gallery"],
  enabled: isSupabaseConfigured,
  queryFn: async (): Promise<GalleryItem[]> => {
    const { data, error } = await requireClient()
      .from("gallery")
      .select("id,url,caption,category")
      .eq("is_published", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as GalleryItem[];
  },
});

export const amenitiesQuery = queryOptions({
  queryKey: ["amenities"],
  enabled: isSupabaseConfigured,
  queryFn: async (): Promise<Amenity[]> => {
    const { data, error } = await requireClient().from("amenities").select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []) as Amenity[];
  },
});

/** Expand blocked ranges ([start,end) ) into a Set of ISO nights. */
export function blockedNights(ranges: { start_date: string; end_date: string }[]) {
  const set = new Set<string>();
  for (const r of ranges) {
    const d = new Date(r.start_date + "T00:00:00");
    const end = new Date(r.end_date + "T00:00:00");
    while (d < end) {
      set.add(toISODate(d));
      d.setDate(d.getDate() + 1);
    }
  }
  return set;
}
