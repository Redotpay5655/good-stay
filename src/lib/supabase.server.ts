import { createClient } from "@supabase/supabase-js";

// Server-only privileged client. The service-role key is read from server
// secrets at call time and never shipped to the browser.
export function getAdminClient() {
  const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) throw new Error("SERVER_NOT_CONFIGURED");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
