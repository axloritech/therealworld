import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "../config";

let cached: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Privileged server-only client (service role). Bypasses RLS, so it must never
 * be imported by client code and never be reachable from the browser bundle.
 * All authorisation for privileged paths is enforced by `requireAdmin()`.
 */
export function createAdminClient() {
  if (cached) return cached;
  cached = createSupabaseClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY || "service-role-key-placeholder",
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  return cached;
}

export function hasAdminClient(): boolean {
  return Boolean(SUPABASE_SERVICE_ROLE_KEY);
}
