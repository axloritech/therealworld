import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs on every navigation:
 *  • refreshes the Supabase auth cookies when a project is configured
 *  • keeps signed-out visitors away from /dashboard and /admin
 *  • bounces signed-in visitors away from /login and /register
 *
 * Role checks for the admin area are enforced server-side in
 * src/app/admin/layout.tsx (and by database policies), never only here.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match everything except static assets and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif)$).*)",
  ],
};
