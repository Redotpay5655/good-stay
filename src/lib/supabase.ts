import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-safe client for YOUR OWN Supabase project.
// Only the public URL + anon/publishable key are used here (safe to expose; RLS protects data).
const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const key = (import.meta.env['VITE_SUPABASE_ANON_KEY'] ??
  import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']) as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    })
  : null;

export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error("NOT_CONFIGURED");
  return supabase;
}
