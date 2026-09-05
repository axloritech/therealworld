#!/usr/bin/env node
/**
 * Seed a Supabase project with the same demo dataset the local sandbox uses:
 * one administrator, six members, deposit history, withdrawal requests in every
 * state, and a few support conversations.
 *
 *   npm run db:seed                    create anything that is missing
 *   npm run db:seed -- --dry-run       show what would happen, change nothing
 *   npm run db:seed -- --force         re-seed history for accounts that exist
 *   npm run db:seed -- --no-withdrawals
 *   npm run db:seed -- --no-threads
 *   npm run db:seed -- --password 'Sandbox123!'
 *
 * How it works — everything goes through the same code paths the app uses:
 *   • accounts      auth.admin.createUser → the on_auth_user_created trigger
 *                   builds the profile, validates/uniquifies the username and
 *                   opens starter balances.
 *   • deposits      credit_funds(p_user_id, …) as the service role.
 *   • withdrawals   signed in AS the member, calling request_withdrawal —
 *                   so limits, address validation and the balance hold are all
 *                   exercised for real — then admin_review_withdrawal to
 *                   approve or reject.
 *   • conversations create_support_thread / send_support_message.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY, with supabase/migrations applied first.
 */
import { createClient } from "@supabase/supabase-js";
import {
  adminClient,
  anonKey,
  fail,
  hasFlag,
  flagValue,
  info,
  loadEnv,
  ok,
  supabaseUrl,
} from "./_env.mjs";

loadEnv();

const argv = process.argv.slice(2);
const DRY = hasFlag(argv, "dry-run");
const FORCE = hasFlag(argv, "force");
const WITH_WITHDRAWALS = !hasFlag(argv, "no-withdrawals");
const WITH_THREADS = !hasFlag(argv, "no-threads");
const MEMBER_PASSWORD = flagValue(argv, "password") || "Demo1234!";
const ADMIN_PASSWORD = flagValue(argv, "admin-password") || "Admin1234!";

/* ── Fixtures ──────────────────────────────────────────────────────────── */

/** Obviously synthetic addresses that satisfy each network's format rules. */
const ADDR = {
  // bc1 + 35 lowercase alphanumerics
  bitcoin: "bc1q" + "demo0sandbox".repeat(2) + "xyz9k4m",
  // 0x + exactly 40 hex characters
  erc20: "0x" + "de".repeat(20),
  arbitrum: "0x" + "ab".repeat(20),
  bep20: "0x" + "be".repeat(20),
  // T + exactly 33 base58 characters
  trc20: "T" + "9Demo1".repeat(5) + "Sbx",
};

const PEOPLE = [
  {
    username: "admin",
    email: "admin@therealworld.demo",
    full_name: "Platform Administrator",
    country: "NG",
    admin: true,
    /** Set absolutely — the administrator holds no demo requests. */
    balances: { BTC: 0.5, ETH: 8, USDT: 45_000 },
  },
  {
    username: "adaeze",
    email: "adaeze@therealworld.demo",
    full_name: "Adaeze Okafor",
    country: "NG",
    credits: [
      { asset: "USDT", amount: 5000, daysAgo: 40, note: "Demo deposit" },
      { asset: "BTC", amount: 0.0821, daysAgo: 38, note: "Demo deposit" },
      { asset: "ETH", amount: 1.94, daysAgo: 36, note: "Demo deposit" },
    ],
    requests: [
      { asset: "USDT", amount: 900, network: "trc20", status: "approved", note: "Verified address, released." },
    ],
    threads: [
      {
        subject: "How long does a withdrawal take?",
        body: "I submitted a USDT request yesterday and it still shows Pending. Is that normal in the sandbox?",
        reply: "Yes — every request waits for an administrator to review it. Yours has now been approved, so you should see the status change on your withdrawals page.",
      },
    ],
  },
  {
    username: "chidi",
    email: "chidi@therealworld.demo",
    full_name: "Chidi Nwosu",
    country: "NG",
    credits: [
      { asset: "USDT", amount: 1500, daysAgo: 30, note: "Demo deposit" },
      { asset: "ETH", amount: 0.8, daysAgo: 26, note: "Demo deposit" },
    ],
    requests: [{ asset: "ETH", amount: 0.18, network: "erc20", status: "approved" }],
  },
  {
    username: "zainab",
    email: "zainab@therealworld.demo",
    full_name: "Zainab Bello",
    country: "NG",
    credits: [
      { asset: "BTC", amount: 0.2044, daysAgo: 21, note: "Demo deposit" },
      { asset: "USDT", amount: 12_000, daysAgo: 18, note: "Demo deposit" },
      { asset: "USDT", amount: 250, type: "bonus", daysAgo: 14, note: "Welcome bonus (demo)" },
    ],
    requests: [{ asset: "BTC", amount: 0.05, network: "bitcoin", status: "pending" }],
    threads: [
      {
        subject: "Which network should I pick for USDT?",
        body: "The withdraw form lists TRC-20, ERC-20 and BEP-20. Does it matter which one I use?",
        reply: "It does — the network must match the receiving wallet. TRC-20 addresses start with T and are 34 characters; ERC-20 and BEP-20 addresses start with 0x. The form rejects a mismatch before you can submit.",
        status: "answered",
      },
    ],
  },
  {
    username: "tunde",
    email: "tunde@therealworld.demo",
    full_name: "Tunde Bakare",
    country: "NG",
    credits: [
      { asset: "USDT", amount: 800, daysAgo: 14, note: "Demo deposit" },
      { asset: "BTC", amount: 0.0042, daysAgo: 11, note: "Demo deposit" },
    ],
    requests: [{ asset: "USDT", amount: 240, network: "trc20", status: "pending" }],
  },
  {
    username: "grace",
    email: "grace@therealworld.demo",
    full_name: "Grace Etim",
    country: "NG",
    credits: [{ asset: "ETH", amount: 0.05, daysAgo: 6, note: "Demo deposit" }],
    requests: [
      {
        asset: "USDT",
        amount: 120,
        network: "bep20",
        status: "rejected",
        note: "Address failed the BEP-20 network check — refunded to balance.",
      },
    ],
  },
  {
    username: "kemi",
    email: "kemi@therealworld.demo",
    full_name: "Kemi Adeyemi",
    country: "NG",
    credits: [{ asset: "USDT", amount: 1250, type: "bonus", daysAgo: 2, note: "Sandbox starter funds" }],
  },
];

/* ── Clients ───────────────────────────────────────────────────────────── */

const service = adminClient();
const url = supabaseUrl();
const anon = anonKey();
if (!anon && (WITH_WITHDRAWALS || WITH_THREADS)) {
  fail(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is required: withdrawal requests are made by\n" +
      "  signing in as each member so the real RPC path is exercised.\n" +
      "  (Or re-run with --no-withdrawals --no-threads.)",
  );
}
const publicClient = anon
  ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const warnings = [];
const created = [];
let adminId = null;

/** Sign in as a seeded member and return a client carrying that session. */
async function asMember(email, password) {
  const scoped = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await scoped.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client: scoped, user: data.user };
}

async function main() {
  console.log(`\nThe Real World — Supabase demo seed${DRY ? "  (dry run)" : ""}`);
  console.log(`Project: ${url}\n`);

  /* ── Preflight: migrations must already be applied ── */
  const { data: assets, error: assetError } = await service.from("asset_config").select("asset");
  if (assetError) {
    fail(
      `Could not read asset_config: ${assetError.message}\n` +
        "  Apply the migrations first (Supabase dashboard → SQL editor, or `supabase db push`).",
    );
  }
  if (!assets || assets.length === 0) {
    fail("asset_config is empty — run supabase/migrations/0001…0004 against this project first.");
  }
  const { data: faqs } = await service.from("faqs").select("id", { count: "exact", head: true });
  ok(`Schema present (${assets.length} assets, ${faqs ?? "?"} FAQ rows)`);

  if (DRY) {
    console.log("\nWould create / update:\n");
    for (const person of PEOPLE) {
      const { data: existing } = await service
        .from("profiles")
        .select("id, username")
        .eq("email", person.email)
        .maybeSingle();
      const label = existing ? `exists (@${existing.username})` : "NEW";
      console.log(`  ${person.admin ? "admin " : "member"}  ${person.username.padEnd(9)} ${person.email.padEnd(32)} ${label}`);
      for (const c of person.credits ?? []) console.log(`          + ${c.amount} ${c.asset} (${c.type ?? "deposit"})`);
      if (person.balances) for (const [a, v] of Object.entries(person.balances)) console.log(`          = ${v} ${a}`);
      for (const r of person.requests ?? []) console.log(`          → withdrawal ${r.amount} ${r.asset} via ${r.network} [${r.status}]`);
      for (const t of person.threads ?? []) console.log(`          💬 "${t.subject}"`);
    }
    console.log(`\nPasswords: members "${MEMBER_PASSWORD}", administrator "${ADMIN_PASSWORD}".`);
    console.log("Re-run without --dry-run to apply.\n");
    return;
  }

  /* ── 1 · Accounts ─────────────────────────────────────────────────── */
  console.log("\nAccounts\n");
  for (const person of PEOPLE) {
    const { data: existing } = await service
      .from("profiles")
      .select("id, username, role")
      .eq("email", person.email)
      .maybeSingle();

    if (existing) {
      person.id = existing.id;
      if (person.admin) adminId = existing.id;
      ok(`@${existing.username} already exists — reusing it`);
      if (person.admin && existing.role !== "admin") {
        const { error } = await service.rpc("admin_set_role", { p_user_id: existing.id, p_role: "admin" });
        if (error) warnings.push(`could not promote @${person.username}: ${error.message}`);
        else ok(`  promoted @${person.username} to admin`);
      }
      continue;
    }

    const { data, error } = await service.auth.admin.createUser({
      email: person.email,
      password: person.admin ? ADMIN_PASSWORD : MEMBER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: person.username,
        full_name: person.full_name,
        country: person.country,
        role: person.admin ? "admin" : "user",
      },
    });
    if (error) {
      warnings.push(`could not create ${person.email}: ${error.message}`);
      continue;
    }

    // The trigger creates the profile; re-read it to get the normalised username.
    const { data: profile } = await service
      .from("profiles")
      .select("id, username, role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile) {
      warnings.push(`auth user created for ${person.email} but no profile appeared — check the on_auth_user_created trigger`);
      continue;
    }
    person.id = profile.id;
    if (person.admin) adminId = profile.id;
    created.push(person);
    ok(`created @${profile.username} (${person.email})${profile.role === "admin" ? " — administrator" : ""}`);
  }

  if (!adminId) {
    warnings.push("no administrator account was created — the admin dashboard will be unreachable");
  }

  /* ── 2 · Balances & history ───────────────────────────────────────── */
  console.log("\nBalances and ledger\n");
  for (const person of PEOPLE) {
    if (!person.id) continue;

    const { count: txCount } = await service
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", person.id)
      .neq("type", "bonus");

    const alreadySeeded = (txCount ?? 0) > 0;
    if (alreadySeeded && !FORCE) {
      info(`@${person.username} already has ledger history — skipping (use --force to add more)`);
      continue;
    }
    person.seedHistory = true;

    if (person.balances) {
      for (const [asset, amount] of Object.entries(person.balances)) {
        const { error } = await service.rpc("admin_set_balance", {
          p_user_id: person.id,
          p_asset: asset,
          p_amount: amount,
          p_note: "Demo balance set by seed script",
          p_admin_id: adminId ?? person.id,
        });
        if (error) warnings.push(`balance ${asset} for @${person.username}: ${error.message}`);
        else ok(`@${person.username} ${asset} = ${amount}`);
      }
      continue;
    }

    for (const credit of person.credits ?? []) {
      const { error } = await service.rpc("credit_funds", {
        p_user_id: person.id,
        p_asset: credit.asset,
        p_amount: credit.amount,
        p_type: credit.type ?? "deposit",
        p_note: credit.note ?? null,
      });
      if (error) warnings.push(`credit ${credit.amount} ${credit.asset} for @${person.username}: ${error.message}`);
      else ok(`@${person.username} +${credit.amount} ${credit.asset} (${credit.type ?? "deposit"})`);
    }
  }

  /* ── 3 · Withdrawal requests, made as each member ─────────────────── */
  if (WITH_WITHDRAWALS) {
    console.log("\nWithdrawal requests\n");
    for (const person of PEOPLE) {
      if (!person.id || !person.seedHistory) continue;
      const requests = person.requests ?? [];
      if (requests.length === 0) continue;

      let scoped;
      try {
        scoped = await asMember(person.email, MEMBER_PASSWORD);
      } catch (e) {
        warnings.push(e.message);
        continue;
      }

      for (const request of requests) {
        const { data: id, error } = await scoped.client.rpc("request_withdrawal", {
          p_asset: request.asset,
          p_amount: request.amount,
          p_network: request.network,
          p_address: ADDR[request.network],
        });
        if (error) {
          warnings.push(`withdrawal ${request.amount} ${request.asset} for @${person.username}: ${error.message}`);
          continue;
        }
        ok(`@${person.username} requested ${request.amount} ${request.asset} via ${request.network} — pending`);

        if (request.status === "pending") continue;

        const { error: reviewError } = await service.rpc("admin_review_withdrawal", {
          p_id: id,
          p_status: request.status,
          p_note: request.note ?? (request.status === "approved" ? "Released by administrator." : "Rejected during demo seeding."),
          p_admin_id: adminId,
        });
        if (reviewError) warnings.push(`review of ${id}: ${reviewError.message}`);
        else ok(`  → ${request.status}`);
      }
    }
  }

  /* ── 4 · Support conversations ────────────────────────────────────── */
  if (WITH_THREADS) {
    console.log("\nSupport conversations\n");
    for (const person of PEOPLE) {
      if (!person.id || !person.seedHistory) continue;
      for (const thread of person.threads ?? []) {
        const { data: threadId, error } = await service.rpc("create_support_thread", {
          p_subject: thread.subject,
          p_body: thread.body,
          p_user_id: person.id,
        });
        if (error) {
          warnings.push(`thread "${thread.subject}": ${error.message}`);
          continue;
        }
        ok(`@${person.username} opened "${thread.subject}"`);
        if (thread.reply && adminId) {
          const { error: replyError } = await service.rpc("send_support_message", {
            p_thread_id: threadId,
            p_body: thread.reply,
            p_user_id: adminId,
          });
          if (replyError) warnings.push(`reply on "${thread.subject}": ${replyError.message}`);
          else ok(`  → admin replied (status: answered)`);
        }
      }
    }
  }

  /* ── 5 · Summary ──────────────────────────────────────────────────── */
  console.log("\n" + "─".repeat(66));
  console.log(`Created ${created.length} account(s), reused ${PEOPLE.filter((p) => p.id && !created.includes(p)).length}.`);
  console.log("\nSign in with:\n");
  console.log("  role        username   password        dashboard");
  for (const person of PEOPLE) {
    if (!person.id) continue;
    const pw = person.admin ? ADMIN_PASSWORD : MEMBER_PASSWORD;
    console.log(
      `  ${person.admin ? "administrator" : "member     "} @${person.username.padEnd(8)} ${pw.padEnd(15)} ${person.admin ? "/admin" : "/dashboard"}`,
    );
  }
  console.log("\n  These are throwaway credentials for a sandbox. Change them before");
  console.log("  showing this to anyone outside your team.\n");

  const { data: stats } = await service.rpc("admin_stats");
  if (stats) {
    console.log(
      `  Members ${stats.users} · pending withdrawals ${stats.pending_withdrawals} · ` +
        `approved ${stats.approved_withdrawals} · open threads ${stats.open_threads}\n`,
    );
  }

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):\n`);
    for (const w of warnings) console.log(`  ! ${w}`);
    console.log();
    process.exitCode = 1;
  }
}

main().catch((e) => {
  fail(e?.message || String(e));
});
