#!/usr/bin/env node
/**
 * Grant or revoke administrator access on a Supabase-backed project.
 *
 *   npm run db:admin -- <username-or-email>              promote to admin
 *   npm run db:admin -- <username-or-email> --revoke     demote to member
 *   npm run db:admin -- --list                           list current admins
 *   npm run db:admin -- --allow-email you@example.com    auto-promote on future sign-up
 *   npm run db:admin -- --allow-email you@example.com --revoke
 *
 * Promotion goes through the `admin_set_role` database function, so the
 * "at least one administrator must remain" guard applies exactly as it does in
 * the admin dashboard, and `auth.users.raw_user_meta_data.role` is kept in sync.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import {
  adminClient,
  fail,
  hasFlag,
  flagValue,
  info,
  loadEnv,
  ok,
  positional,
} from "./_env.mjs";

loadEnv();

const USAGE = `
Usage
  npm run db:admin -- <username-or-email>              promote to admin
  npm run db:admin -- <username-or-email> --revoke     demote to member
  npm run db:admin -- --list                           list current admins
  npm run db:admin -- --allow-email you@example.com    auto-promote that address on sign-up
  npm run db:admin -- --allow-email you@example.com --revoke   remove the auto-promotion
`;

const db = adminClient();
const revoke = hasFlag(process.argv.slice(2), "revoke");
const list = hasFlag(process.argv.slice(2), "list");
const allowEmail = flagValue(process.argv.slice(2), "allow-email");

/* ── --list ───────────────────────────────────────────────────────────── */
if (list) {
  const { data, error } = await db
    .from("profiles")
    .select("username, email, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });
  if (error) fail(error.message);

  const admins = data ?? [];
  console.log(`\nAdministrators (${admins.length})\n`);
  if (admins.length === 0) {
    info("none — promote someone now, or the admin dashboard will be unreachable.");
  }
  for (const a of admins) {
    console.log(`  \u2022 @${a.username}  ${a.email}${a.full_name ? `  (${a.full_name})` : ""}`);
  }

  const { data: allowed } = await db
    .from("admin_emails")
    .select("email")
    .order("email");
  if (allowed && allowed.length > 0) {
    console.log(`\nAuto-promoted on sign-up (${allowed.length})\n`);
    for (const row of allowed) console.log(`  \u2022 ${row.email}`);
  }
  console.log();
  process.exit(0);
}

/* ── --allow-email ────────────────────────────────────────────────────── */
if (allowEmail) {
  const email = allowEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(`"${email}" is not a valid email address.`);

  // Also promote them right away if they already have an account.
  const { data: existing } = await db.from("profiles").select("id, username, role").eq("email", email).maybeSingle();

  if (revoke) {
    const { error } = await db.from("admin_emails").delete().eq("email", email);
    if (error) fail(error.message);
    ok(`Removed ${email} from the auto-promotion list.`);
    if (existing && existing.role === "admin") {
      info(`${existing.username} is still an administrator — run without --revoke on their account to demote them.`);
    }
    process.exit(0);
  }

  const { error } = await db
    .from("admin_emails")
    .upsert({ email }, { onConflict: "email" });
  if (error) fail(error.message);
  ok(`${email} will be promoted automatically when it registers.`);

  if (existing && existing.role !== "admin") {
    const { error: roleError } = await db.rpc("admin_set_role", {
      p_user_id: existing.id,
      p_role: "admin",
    });
    if (roleError) fail(roleError.message);
    ok(`Promoted the existing account @${existing.username} to admin.`);
  } else if (existing) {
    info(`@${existing.username} is already an administrator.`);
  }
  process.exit(0);
}

/* ── promote / demote an account ──────────────────────────────────────── */
const target = positional(process.argv.slice(2))[0];
if (!target) {
  console.log(USAGE);
  process.exit(1);
}

const needle = target.trim().toLowerCase();
const looksLikeEmail = needle.includes("@");

const { data, error } = await db
  .from("profiles")
  .select("id, username, email, role, is_active")
  .or(looksLikeEmail ? `email.eq.${needle}` : `username.eq.${needle},email.eq.${needle}`)
  .maybeSingle();

if (error) fail(error.message);
if (!data) {
  fail(
    `No account found for "${target}".\n` +
      `  The person must register first, or pre-authorise their address with:\n` +
      `  npm run db:admin -- --allow-email ${needle}`,
  );
}

const nextRole = revoke ? "user" : "admin";
if (data.role === nextRole) {
  ok(`@${data.username} (${data.email}) is already ${nextRole === "admin" ? "an administrator" : "a member"}.`);
  process.exit(0);
}

const { error: roleError } = await db.rpc("admin_set_role", {
  p_user_id: data.id,
  p_role: nextRole,
});
if (roleError) fail(roleError.message);

if (revoke) {
  ok(`@${data.username} (${data.email}) is now a member.`);
} else {
  ok(`@${data.username} (${data.email}) is now an administrator.`);
  info("They must sign out and back in for the new role to appear in their session.");
}
if (!data.is_active) info("Note: this account is currently suspended.");

const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
console.log(`\n  Administrators now: ${count ?? "?"}\n`);
