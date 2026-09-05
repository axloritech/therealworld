import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";

/**
 * Session-scoped server client. Inherits the signed-in user's JWT, so every
 * query it runs is filtered by the row-level security policies in the database.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY || "public-anon-key-placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore, the middleware
            // refreshes sessions on the way in.
          }
        },
      },
    },
  );
}
