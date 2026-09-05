/**
 * Shared helpers for the Node scripts in this folder.
 *
 * Zero extra dependencies: we read `.env.local` ourselves rather than pulling
 * in dotenv, so `npm run db:admin` works on a fresh clone.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Parse a .env file into an object. Handles quotes, `export` and comments. */
function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7) : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Load `.env.local` then `.env` into `process.env` without overriding values
 * that are already set (so real shell/CI variables always win).
 */
export function loadEnv(cwd = process.cwd()) {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(cwd, file);
    if (!fs.existsSync(full)) continue;
    const parsed = parseEnv(fs.readFileSync(full, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }
  return process.env;
}

function first(...keys) {
  for (const key of keys) {
    const value = (process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
}

export function supabaseUrl() {
  return first("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

export function anonKey() {
  return first("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
}

export function serviceRoleKey() {
  return first("SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * A service-role client, or a clear exit if the project is not configured.
 * Scripts must never fall back to the anon key: every operation here is
 * privileged, and a silent downgrade would produce confusing RLS errors.
 */
export function adminClient() {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) {
    console.error(`
Cannot run this script: Supabase is not configured.

Required environment variables (in .env.local or the shell):
  NEXT_PUBLIC_SUPABASE_URL     your project URL
  SUPABASE_SERVICE_ROLE_KEY    the secret service-role key (server-only)

Find both under  Supabase dashboard → Project Settings → API.
The service-role key must NEVER be committed or exposed to the browser.
`);
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** `--flag` present? */
export function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

/** Value following `--name value`. */
export function flagValue(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** Positional arguments (anything not a flag or a flag's value). */
export function positional(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) i++;
      continue;
    }
    out.push(token);
  }
  return out;
}

export function fail(message) {
  console.error(`\n\u2717 ${message}\n`);
  process.exit(1);
}

export function info(message) {
  console.log(`  \u2022 ${message}`);
}

export function ok(message) {
  console.log(`  \u2713 ${message}`);
}
