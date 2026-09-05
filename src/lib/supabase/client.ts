import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";

/** Browser client — anon key only, fully governed by row-level security. */
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY || "public-anon-key-placeholder",
  );
}
