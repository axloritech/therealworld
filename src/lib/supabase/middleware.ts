import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";

export const SESSION_COOKIE = "trw_demo_session";

/** Paths that need a signed-in user. */
const PROTECTED = ["/dashboard", "/admin", "/account"];

export function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth cookies on every request and redirects
 * unauthenticated visitors away from protected areas. Authoritative role
 * checks still happen server-side in the admin layout (see lib/auth.ts).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Do not run code between createServerClient and getUser().
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    if (!user && isProtected(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (user && (pathname === "/login" || pathname === "/register")) {
      const url = request.nextUrl.clone();
      url.pathname = user.user_metadata?.role === "admin" ? "/admin" : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ── Demo mode: gate protected routes on the presence of a sandbox session ──
  const { pathname, search } = request.nextUrl;
  const demoToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!demoToken && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (demoToken && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
