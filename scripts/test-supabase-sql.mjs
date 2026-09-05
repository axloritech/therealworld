/**
 * Supabase SQL validation harness.
 *
 * Spins up a throwaway embedded Postgres cluster, recreates the small part of
 * Supabase's environment the migrations depend on (auth schema, JWT GUCs, the
 * anon / authenticated / service_role roles and Supabase-style default
 * privileges), applies supabase/migrations in order and then exercises the
 * schema, triggers, RPCs, RLS policies and constraints — including the
 * administrator treasury-send path.
 *
 * Optional dependency (not installed by default):
 *   npm i -D embedded-postgres @embedded-postgres/linux-x64 pg
 * then:  node scripts/test-supabase-sql.mjs
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Overridable so the harness can also run from a scratch directory that has
// the optional dependencies installed.
const MIGRATIONS_DIR = process.env.PGTEST_MIGRATIONS || path.join(ROOT, "supabase", "migrations");
const DATA_DIR = process.env.PGTEST_DATA || path.join(ROOT, ".data", "pg-test");
const PORT = Number(process.env.PGTEST_PORT || 54329);

/* ── Minimal Supabase-compatible shim ──────────────────────────────────── */
const SHIM = `
create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  ), '')::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  ), ''), 'anon')
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Mirror Supabase's default privileges so migration 3's revokes are decisive.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

let pass = 0;
let fail = 0;
const failures = [];
function ok(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  \u2713 ${name}`); }
  else { fail++; failures.push(name); console.log(`  \u2717 ${name} ${extra}`); }
}

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: false,
  onLog: () => {},
});
const client = pg.getPgClient();

const val = async (sql, params = []) => {
  const r = await client.query(sql, params);
  if (!r.rows[0]) return undefined;
  const v = Object.values(r.rows[0])[0];
  return typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
};
const row = async (sql, params = []) => (await client.query(sql, params)).rows[0];
const raises = async (sql, params = []) => {
  try { await client.query(sql, params); return ""; } catch (e) { return e.message; }
};
async function raisesMsg(name, sql, params = [], needle = null) {
  const msg = await raises(sql, params);
  ok(name, msg !== "" && (needle === null || msg.toLowerCase().includes(needle.toLowerCase())),
    msg === "" ? "(did not raise)" : `\u2192 ${msg.split("\n")[0]}`);
}
async function okMsg(name, sql, params = []) {
  const msg = await raises(sql, params);
  ok(name, msg === "", msg.split("\n")[0]);
}
async function as(role, sub, fn) {
  await client.query("reset role");
  await client.query(`select set_config('request.jwt.claims', '', false)`);
  if (role) await client.query(`set role ${role}`);
  const claims =
    role === "service_role" ? JSON.stringify({ role: "service_role" })
    : sub ? JSON.stringify({ sub, role: "authenticated" })
    : JSON.stringify({ role });
  await client.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  try { return await fn(); }
  finally {
    await client.query("reset role");
    await client.query(`select set_config('request.jwt.claims', '', false)`);
  }
}
const asAnon = (fn) => as("anon", null, fn);
const asUser = (id, fn) => as("authenticated", id, fn);
const asService = (fn) => as("service_role", null, fn);
const bal = (u, a) => val(`select amount from public.balances where user_id=$1 and asset=$2`, [u, a]);

const signup = async (email, username, role = "user") =>
  (await client.query(
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, jsonb_build_object('username', $2::text, 'role', $3::text))
     returning id`,
    [email, username, role],
  )).rows[0].id;

const TRC20 = "T" + "9Demo1".repeat(5) + "Sbx";
const EVM = "0x" + "de".repeat(20);

async function main() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  await pg.initialise();
  await pg.start();
  await client.connect();

  console.log("\n\u2550\u2550\u2550 Applying migrations \u2550\u2550\u2550");
  await client.query(SHIM);
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const msg = await raises(sql);
    ok(`apply ${file}`, msg === "", msg.split("\n").slice(0, 3).join(" | "));
  }

  console.log("\n\u2500\u2500 Schema sanity \u2500\u2500");
  ok("3 assets configured", (await val(`select count(*) from public.asset_config`)) === 3);
  ok("20 FAQ rows", (await val(`select count(*) from public.faqs`)) === 20);
  ok("9 tables with RLS", (await val(
    `select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relrowsecurity and c.relkind='r'`)) === 9);
  ok("transactions check constraint accepts the treasury type", (await val(
    `select count(*) from pg_constraint
      where conname = 'transactions_type_check'
        and pg_get_constraintdef(oid) like '%treasury%'`)) === 1);

  console.log("\n\u2500\u2500 Sign-up + roles \u2500\u2500");
  const alice = await signup("alice@example.com", "alice");
  const bob = await signup("bob@example.com", "bob");
  ok("profile auto-created", (await val(`select username from public.profiles where id=$1`, [alice])) === "alice");
  ok("starter USDT 1250", Number(await bal(alice, "USDT")) === 1250);
  await raisesMsg("duplicate username rolled back",
    `insert into auth.users (email, raw_user_meta_data) values ('x@y.com', '{"username":"alice"}')`, [], "already taken");
  await client.query(`insert into public.admin_emails (email) values ('root@example.com')`);
  const rootId = await signup("root@example.com", "rootuser");
  ok("admin_emails auto-promotion", (await val(`select role from public.profiles where id=$1`, [rootId])) === "admin");

  console.log("\n\u2500\u2500 Treasury sends \u2500\u2500");
  await asUser(alice, async () => {
    await raisesMsg("member cannot send treasury funds to themselves",
      `select public.credit_funds($1, 'USDT', 100, 'treasury', 'hack')`, [alice], "only administrators");
    await raisesMsg("member cannot send treasury funds to others",
      `select public.credit_funds($1, 'USDT', 100, 'treasury', 'hack')`, [bob], "own account");
    ok("member deposits still allowed",
      typeof (await val(`select public.credit_funds($1, 'USDT', 250, 'deposit', null)`, [alice])) === "string");
  });
  await asUser(rootId, async () => {
    const ref = await val(`select public.credit_funds($1, 'USDT', 1000, 'treasury', 'Welcome gift')`, [alice]);
    ok("admin treasury send returns a reference", String(ref).startsWith("TRW-"), String(ref));
    // starter 1250 + member deposit 250 + treasury 1000
    ok("recipient credited", Number(await bal(alice, "USDT")) === 2500, String(await bal(alice, "USDT")));
    ok("ledger entry typed treasury", (await val(
      `select type from public.transactions where reference=$1`, [ref])) === "treasury");
    await okMsg("admin treasury send in BTC",
      `select public.credit_funds($1, 'BTC', 0.25, 'treasury', null)`, [alice]);
  });
  await asService(async () => {
    await okMsg("service role can send treasury funds",
      `select public.credit_funds($1, 'ETH', 1, 'treasury', null)`, [alice]);
  });
  const stats1 = await asUser(rootId, () => val(`select public.admin_stats()`));
  const sent = stats1.treasury_sent_usd;
  ok("admin_stats reports treasury_sent_usd",
    Math.abs(Number(sent) - (1000 + 0.25 * 68250 + 3540)) < 1e-6, String(sent));
  await asUser(alice, async () => {
    await raisesMsg("member cannot read platform stats", `select public.admin_stats()`, [], "administrator access");
    ok("member sees the treasury credit in their ledger",
      (await val(`select count(*) from public.transactions where user_id=$1 and type='treasury'`, [alice])) === 3);
  });

  console.log("\n\u2500\u2500 Withdrawal lifecycle (regression) \u2500\u2500");
  let w1, w2;
  const usdtBefore = Number(await bal(alice, "USDT"));
  await asUser(alice, async () => {
    w1 = await val(`select public.request_withdrawal('USDT', 300, 'trc20', $1)`, [TRC20]);
    ok("pending + hold", Number(await bal(alice, "USDT")) === usdtBefore - 300, String(await bal(alice, "USDT")));
    w2 = await val(`select public.request_withdrawal('USDT', 200, 'trc20', $1)`, [TRC20]);
    await okMsg("owner cancels", `select public.cancel_withdrawal($1)`, [w2]);
    ok("cancel refunds", Number(await bal(alice, "USDT")) === usdtBefore - 300, String(await bal(alice, "USDT")));
    await raisesMsg("overdraft blocked (within per-request max)",
      `select public.request_withdrawal('USDT', 50000, 'trc20', $1)`, [TRC20], "insufficient");
  });
  await asUser(rootId, async () => {
    await okMsg("approve", `select public.admin_review_withdrawal($1, 'approved', 'ok', null)`, [w1]);
    ok("no refund on approval", Number(await bal(alice, "USDT")) === usdtBefore - 300, String(await bal(alice, "USDT")));
  });
  const ethBefore = Number(await bal(alice, "ETH"));
  let w3;
  await asUser(alice, async () => {
    w3 = await val(`select public.request_withdrawal('ETH', 0.2, 'erc20', $1)`, [EVM]);
    ok("ETH held on request", Number(await bal(alice, "ETH")) === ethBefore - 0.2, String(await bal(alice, "ETH")));
  });
  await asUser(rootId, async () => {
    await okMsg("reject with reason",
      `select public.admin_review_withdrawal($1, 'rejected', 'nope', null)`, [w3]);
    ok("reject refunds the hold", Number(await bal(alice, "ETH")) === ethBefore, String(await bal(alice, "ETH")));
    ok("reversal entry written", (await val(
      `select count(*) from public.transactions where user_id=$1 and type='withdrawal_reversal'`, [alice])) >= 1);
  });

  console.log("\n\u2500\u2500 RLS spot checks \u2500\u2500");
  await asAnon(async () => {
    ok("anon sees no balances", (await val(`select count(*) from public.balances`)) === 0);
    ok("anon reads FAQs", (await val(`select count(*) from public.faqs`)) === 20);
    await raisesMsg("anon cannot call treasury-able credit_funds",
      `select public.credit_funds(gen_random_uuid(), 'USDT', 1, 'deposit', null)`, [], "permission denied");
  });
  await asUser(bob, async () => {
    ok("bob cannot see alice's balances",
      (await val(`select count(*) from public.balances where user_id=$1`, [alice])) === 0);
    ok("bob sees his own", (await val(`select count(*) from public.balances where user_id=$1`, [bob])) === 3);
  });

  console.log("\n\u2500\u2500 Idempotency \u2500\u2500");
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    ok(`re-run ${file}`, (await raises(sql)) === "");
  }

  console.log(`\n\u2550\u2550\u2550 ${pass} passed, ${fail} failed \u2550\u2550\u2550`);
  if (failures.length) console.log("Failed:\n  - " + failures.join("\n  - "));
  await client.end();
  await pg.stop();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("\nFATAL:", e.message);
  try { await client.end(); } catch {}
  try { await pg.stop(); } catch {}
  process.exit(1);
});
