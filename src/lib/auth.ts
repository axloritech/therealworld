import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HAS_SUPABASE, isAutoAdminEmail } from "./config";
import { getRepo } from "./repo";
import { createSessionClient } from "./supabase/server";
import { SESSION_COOKIE } from "./supabase/middleware";
import {
  createSession,
  destroySession,
  readSession,
  verifyPassword,
  type DemoUser,
} from "./demo-store";
import {
  normaliseUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "./validate";
import type { ActionResult, Profile, SessionUser } from "./types";

/* ═══════════════════════════════════════════════════════════════════════
   One authentication surface for both backends.

   • Supabase mode → Supabase Auth (bcrypt, signed JWT cookies, RLS).
   • Demo mode     → scrypt-hashed passwords + signed httpOnly session cookie.

   Either way the rest of the app only ever sees a `Profile`.
   ═══════════════════════════════════════════════════════════════════════ */

export const DEMO_COOKIE = SESSION_COOKIE;
export const DEMO_SESSION_DAYS = 7;

async function demoCookieToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value;
}

/** The signed-in profile, or null. Cheap enough to call in any server component. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (HAS_SUPABASE) {
    const supabase = await createSessionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const repo = getRepo();
    let profile = await repo.findProfileById(user.id);
    if (!profile) {
      // Auth user exists but the profile row is missing (e.g. inserted before
      // the migration ran). Create it so the account stays usable.
      const username =
        normaliseUsername(user.user_metadata?.username) ||
        normaliseUsername(user.email?.split("@")[0]) ||
        `user_${user.id.slice(0, 6)}`;
      profile = await repo.createProfile({
        id: user.id,
        username,
        email: user.email ?? `${user.id}@no-email.local`,
        full_name: user.user_metadata?.full_name ?? null,
        role: isAutoAdminEmail(user.email) ? "admin" : "user",
      });
    }
    return { profile };
  }

  const token = await demoCookieToken();
  if (!token) return null;
  const user = readSession(token);
  if (!user) return null;
  const { password_hash: _pw, ...profile } = user;
  void _pw;
  return { profile };
}

/** Redirects to /login when signed out. */
export async function requireUser(next?: string): Promise<Profile> {
  const session = await getSessionUser();
  if (!session) {
    const target = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
    redirect(target);
  }
  if (!session.profile.is_active) redirect("/login?error=suspended");
  return session.profile;
}

/** Redirects non-admins back to their own dashboard. Role is read from the DB. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser("/admin");
  if (profile.role !== "admin") redirect("/dashboard?error=forbidden");
  return profile;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSessionUser();
  return session?.profile.role === "admin";
}

/* ───────────────────────── Sign up ───────────────────────── */

export async function signUp(input: {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}): Promise<ActionResult<{ redirect: string }>> {
  const username = normaliseUsername(input.username);
  const email = input.email.trim().toLowerCase();

  const usernameError = validateUsername(username);
  if (usernameError) return { ok: false, error: usernameError, field: "username" };
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError, field: "email" };
  const passwordError = validatePassword(input.password);
  if (passwordError) return { ok: false, error: passwordError, field: "password" };

  const repo = getRepo();
  if (await repo.usernameTaken(username)) {
    return { ok: false, error: "That username is already taken. Try another.", field: "username" };
  }
  if (await repo.emailTaken(email)) {
    return { ok: false, error: "That email is already registered. Try signing in.", field: "email" };
  }

  const role = isAutoAdminEmail(email) ? "admin" : "user";

  try {
    if (HAS_SUPABASE) {
      const supabase = await createSessionClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: { username, full_name: input.full_name ?? null, role },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
        },
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already registered") || message.includes("already been registered")) {
          return { ok: false, error: "That email is already registered. Try signing in.", field: "email" };
        }
        if (message.includes("username")) {
          return { ok: false, error: "That username is already taken. Try another.", field: "username" };
        }
        return { ok: false, error: error.message };
      }

      // The database trigger creates the profile row from user_metadata.
      if (data.user) {
        const profile = await repo.findProfileById(data.user.id);
        if (!profile) {
          await repo.createProfile({
            id: data.user.id,
            username,
            email,
            full_name: input.full_name ?? null,
            role,
          });
        }
      }

      // Confirmations may be enabled on the project — tell the user either way.
      if (!data.session) {
        return {
          ok: true,
          data: { redirect: "/login?welcome=confirm" },
        };
      }
      return { ok: true, data: { redirect: role === "admin" ? "/admin" : "/dashboard?welcome=1" } };
    }

    // ── Demo mode ──────────────────────────────────────────────────────
    const profile = await repo.createProfile({
      id: crypto.randomUUID(),
      username,
      email,
      full_name: input.full_name?.trim() || null,
      role,
      password: input.password,
    });
    await startDemoSession(profile.id);
    return {
      ok: true,
      data: { redirect: role === "admin" ? "/admin" : "/dashboard?welcome=1" },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Could not create that account." };
  }
}

/* ───────────────────────── Sign in ───────────────────────── */

export async function signIn(input: {
  identifier: string;
  password: string;
}): Promise<ActionResult<{ redirect: string }>> {
  const identifier = input.identifier.trim();
  if (!identifier) return { ok: false, error: "Enter your username or email.", field: "identifier" };
  if (!input.password) return { ok: false, error: "Enter your password.", field: "password" };

  const repo = getRepo();
  const looksLikeEmail = identifier.includes("@");

  try {
    if (HAS_SUPABASE) {
      // Supabase Auth signs in with an email, so resolve usernames first.
      let email = looksLikeEmail ? identifier.toLowerCase() : null;
      if (!email) {
        const profile = await repo.findProfileByUsername(normaliseUsername(identifier));
        if (!profile) {
          return { ok: false, error: "No account found with those details.", field: "identifier" };
        }
        email = profile.email;
      }

      const supabase = await createSessionClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("invalid login")) {
          return { ok: false, error: "Incorrect username/email or password.", field: "password" };
        }
        if (message.includes("not confirmed")) {
          return { ok: false, error: "Please confirm your email address first.", field: "identifier" };
        }
        return { ok: false, error: error.message };
      }

      const profile = data.user
        ? await repo.findProfileById(data.user.id)
        : null;
      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        return { ok: false, error: "This account is suspended. Contact support." };
      }
      return {
        ok: true,
        data: { redirect: profile?.role === "admin" ? "/admin" : "/dashboard" },
      };
    }

    // ── Demo mode ──────────────────────────────────────────────────────
    const target = looksLikeEmail ? identifier.toLowerCase() : normaliseUsername(identifier);
    const { demoRepo } = await import("./repo-demo");
    const user = demoRepo.verifyCredentials(target, input.password);
    if (!user) {
      return { ok: false, error: "Incorrect username/email or password.", field: "password" };
    }
    demoRepo.touchLastSeen(user.id);
    await startDemoSession(user.id);
    return { ok: true, data: { redirect: user.role === "admin" ? "/admin" : "/dashboard" } };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Could not sign you in." };
  }
}

/* ───────────────────────── Sign out ───────────────────────── */

export async function signOut(): Promise<void> {
  if (HAS_SUPABASE) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
    return;
  }
  const token = await demoCookieToken();
  destroySession(token);
  const store = await cookies();
  store.delete(DEMO_COOKIE);
}

/* ───────────────────────── Demo session cookie ───────────────────────── */

async function startDemoSession(userId: string): Promise<void> {
  const token = createSession(userId);
  const store = await cookies();
  store.set(DEMO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * DEMO_SESSION_DAYS,
  });
}

/* ───────────────────────── Password change ───────────────────────── */

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, error: "You need to be signed in." };

  const passwordError = validatePassword(input.newPassword);
  if (passwordError) return { ok: false, error: passwordError, field: "newPassword" };
  if (input.currentPassword === input.newPassword) {
    return { ok: false, error: "Choose a password you have not used here before.", field: "newPassword" };
  }

  const repo = getRepo();

  if (HAS_SUPABASE) {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.updateUser({ password: input.newPassword });
    if (error) {
      if (error.message.toLowerCase().includes("password")) {
        return { ok: false, error: error.message, field: "newPassword" };
      }
      return { ok: false, error: error.message };
    }
    void data;
    return { ok: true, data: undefined };
  }

  const token = await demoCookieToken();
  const user: DemoUser | null = readSession(token);
  if (!user) return { ok: false, error: "Session expired — please sign in again." };
  if (!verifyPassword(input.currentPassword, user.password_hash)) {
    return { ok: false, error: "Your current password is incorrect.", field: "currentPassword" };
  }
  // DemoRepo.setPassword hashes internally; Supabase mode returns above.
  await repo.setPassword(session.profile.id, input.newPassword);
  return { ok: true, data: undefined };
}
