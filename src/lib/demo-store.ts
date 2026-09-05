import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ASSETS, DEMO_SEED, STARTER_BALANCES, assetMeta } from "./config";
import { sampleAddress } from "./validate";
import type { Asset, Profile, SupportMessage, SupportThread, Transaction, Withdrawal } from "./types";

/* ═══════════════════════════════════════════════════════════════════════
   Local sandbox database.
   A single JSON document, held in memory and flushed to disk. Used only when
   no Supabase keys are present so the product is instantly clickable.
   Contains nothing real — it is a demo fixture store.
   ═══════════════════════════════════════════════════════════════════════ */

export interface DemoUser extends Profile {
  password_hash: string;
}

export interface DemoSession {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export interface DemoDb {
  version: number;
  seeded_at: string | null;
  users: DemoUser[];
  balances: Record<string, Record<Asset, number>>;
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  threads: SupportThread[];
  messages: SupportMessage[];
  sessions: DemoSession[];
}

const DB_VERSION = 1;
const CACHE_KEY = Symbol.for("therealworld.demo-db");
const PATH_CACHE_KEY = Symbol.for("therealworld.demo-db-path");

type GlobalStore = {
  [CACHE_KEY]?: DemoDb;
  [PATH_CACHE_KEY]?: string;
};
const g = globalThis as unknown as GlobalStore;

export const DEMO_PASSWORD = "Demo1234!";
export const DEMO_ADMIN_PASSWORD = "Admin1234!";

/* ── Password hashing (scrypt) ───────────────────────────────────────── */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  try {
    const derived = crypto.scryptSync(password.normalize("NFKC"), salt, 64);
    const want = Buffer.from(expected, "hex");
    return want.length === derived.length && crypto.timingSafeEqual(want, derived);
  } catch {
    return false;
  }
}

export function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function newId(prefix = ""): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function newReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TRW-${stamp}-${rand}`;
}

/* ── Storage path resolution ─────────────────────────────────────────── */

function resolveDbPath(): string {
  if (g[PATH_CACHE_KEY]) return g[PATH_CACHE_KEY];
  const explicit = process.env.DEMO_DB_PATH?.trim();
  const candidates = explicit
    ? [path.resolve(explicit)]
    : [path.join(process.cwd(), ".data", "demo-db.json"), path.join(os.tmpdir(), "therealworld-demo-db.json")];

  for (const file of candidates) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // Probe writability (read-only hosts like Vercel reject this outside /tmp).
      fs.accessSync(path.dirname(file), fs.constants.W_OK);
      const probe = path.join(path.dirname(file), `.write-probe-${process.pid}`);
      fs.writeFileSync(probe, "ok");
      fs.rmSync(probe, { force: true });
      g[PATH_CACHE_KEY] = file;
      return file;
    } catch {
      /* try the next candidate */
    }
  }
  g[PATH_CACHE_KEY] = candidates[candidates.length - 1];
  return g[PATH_CACHE_KEY];
}

export function demoDbPath(): string {
  return resolveDbPath();
}

function emptyDb(): DemoDb {
  return {
    version: DB_VERSION,
    seeded_at: null,
    users: [],
    balances: {},
    transactions: [],
    withdrawals: [],
    threads: [],
    messages: [],
    sessions: [],
  };
}

function load(): DemoDb {
  if (g[CACHE_KEY]) return g[CACHE_KEY];
  const file = resolveDbPath();
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<DemoDb>;
    const db: DemoDb = { ...emptyDb(), ...parsed, version: DB_VERSION };
    db.users ??= [];
    db.balances ??= {};
    db.transactions ??= [];
    db.withdrawals ??= [];
    db.threads ??= [];
    db.messages ??= [];
    db.sessions ??= [];
    g[CACHE_KEY] = db;
  } catch {
    g[CACHE_KEY] = emptyDb();
  }
  if (!g[CACHE_KEY]!.seeded_at && DEMO_SEED) {
    seed(g[CACHE_KEY]!);
    persist();
  }
  return g[CACHE_KEY]!;
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  const db = g[CACHE_KEY];
  if (!db) return;
  const file = resolveDbPath();
  const flush = () => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, file);
    } catch (err) {
      console.warn("[demo-store] could not persist sandbox db:", (err as Error).message);
    }
  };
  // Coalesce bursts of writes.
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 40);
  if (typeof writeTimer === "object" && "unref" in writeTimer) writeTimer.unref?.();
}

/** Read the database (seeds on first access when DEMO_SEED is on). */
export function readDb(): DemoDb {
  return load();
}

/** Mutate + persist in one step. */
export function mutateDb<T>(fn: (db: DemoDb) => T): T {
  const db = load();
  const result = fn(db);
  persist();
  return result;
}

/* ── Sessions ────────────────────────────────────────────────────────── */

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function createSession(userId: string): string {
  const token = newToken();
  const now = Date.now();
  mutateDb((db) => {
    db.sessions.push({
      token,
      user_id: userId,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
    });
    // Keep the session table tidy.
    db.sessions = db.sessions.filter((s) => new Date(s.expires_at).getTime() > now).slice(-500);
  });
  return token;
}

export function readSession(token: string | undefined | null): DemoUser | null {
  if (!token) return null;
  const db = load();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    mutateDb((d) => {
      d.sessions = d.sessions.filter((s) => s.token !== token);
    });
    return null;
  }
  return db.users.find((u) => u.id === session.user_id) ?? null;
}

export function destroySession(token: string | undefined | null): void {
  if (!token) return;
  mutateDb((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token);
  });
}

/* ── Balance helpers ─────────────────────────────────────────────────── */

export function emptyBalances(): Record<Asset, number> {
  return { BTC: 0, ETH: 0, USDT: 0 };
}

export function balancesFor(db: DemoDb, userId: string): Record<Asset, number> {
  const stored = db.balances[userId];
  const out = emptyBalances();
  if (stored) for (const a of ASSETS) out[a] = Number(stored[a] ?? 0);
  return out;
}

export function roundAsset(asset: Asset, value: number): number {
  const f = 10 ** assetMeta(asset).decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function setBalances(db: DemoDb, userId: string, next: Record<Asset, number>) {
  db.balances[userId] = {
    BTC: roundAsset("BTC", next.BTC),
    ETH: roundAsset("ETH", next.ETH),
    USDT: roundAsset("USDT", next.USDT),
  };
}

export function pushTransaction(
  db: DemoDb,
  tx: Omit<Transaction, "id" | "created_at"> & { created_at?: string },
): Transaction {
  const row: Transaction = {
    ...tx,
    id: newId("tx"),
    created_at: tx.created_at ?? new Date().toISOString(),
  };
  db.transactions.unshift(row);
  return row;
}

/* ═══════════════════════════════════════════════════════════════════════
   Seed fixtures — clearly synthetic demo data
   ═══════════════════════════════════════════════════════════════════════ */

interface SeedPerson {
  username: string;
  email: string;
  full_name: string;
  role: "user" | "admin";
  password: string;
  country: string;
  daysAgo: number;
  balances: Partial<Record<Asset, number>>;
}

const SEED_PEOPLE: SeedPerson[] = [
  {
    username: "admin",
    email: "admin@therealworld.demo",
    full_name: "Platform Administrator",
    role: "admin",
    password: DEMO_ADMIN_PASSWORD,
    country: "NG",
    daysAgo: 96,
    balances: { BTC: 0.5, ETH: 8, USDT: 45_000 },
  },
  {
    username: "adaeze",
    email: "adaeze@therealworld.demo",
    full_name: "Adaeze Okonkwo",
    role: "user",
    password: DEMO_PASSWORD,
    country: "NG",
    daysAgo: 41,
    balances: { BTC: 0.0821, ETH: 1.94, USDT: 4_820.55 },
  },
  {
    username: "chidi",
    email: "chidi@therealworld.demo",
    full_name: "Chidi Balogun",
    role: "user",
    password: DEMO_PASSWORD,
    country: "NG",
    daysAgo: 33,
    balances: { BTC: 0.0134, ETH: 0.62, USDT: 1_275 },
  },
  {
    username: "zainab",
    email: "zainab@therealworld.demo",
    full_name: "Zainab Yusuf",
    role: "user",
    password: DEMO_PASSWORD,
    country: "NG",
    daysAgo: 22,
    balances: { BTC: 0.2044, ETH: 3.11, USDT: 9_640 },
  },
  {
    username: "tunde",
    email: "tunde@therealworld.demo",
    full_name: "Tunde Ajayi",
    role: "user",
    password: DEMO_PASSWORD,
    country: "NG",
    daysAgo: 15,
    balances: { BTC: 0.0042, ETH: 0.18, USDT: 610 },
  },
  {
    username: "grace",
    email: "grace@therealworld.demo",
    full_name: "Grace Etim",
    role: "user",
    password: DEMO_PASSWORD,
    country: "NG",
    daysAgo: 7,
    balances: { BTC: 0, ETH: 0.05, USDT: 320 },
  },
  {
    username: "kemi",
    email: "kemi@therealworld.demo",
    full_name: "Kemi Adeyemi",
    role: "user",
    password: DEMO_PASSWORD,
    country: "NG",
    daysAgo: 2,
    balances: STARTER_BALANCES,
  },
];

function seed(db: DemoDb) {
  db.seeded_at = new Date().toISOString();
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000).toISOString();

  // ── Users ────────────────────────────────────────────────────────────
  for (const person of SEED_PEOPLE) {
    const id = newId("usr");
    db.users.push({
      id,
      username: person.username,
      email: person.email,
      full_name: person.full_name,
      role: person.role,
      phone: null,
      country: person.country,
      avatar_url: null,
      is_active: true,
      created_at: days(person.daysAgo),
      last_seen_at: days(Math.max(0, person.daysAgo - 1)),
      password_hash: hashPassword(person.password),
    });
    setBalances(db, id, { ...emptyBalances(), ...person.balances });
  }

  const byUsername = (u: string) => db.users.find((x) => x.username === u)!;
  const admin = byUsername("admin");

  // ── Ledger history ───────────────────────────────────────────────────
  const ledger: {
    user: string;
    asset: Asset;
    type: Transaction["type"];
    direction: Transaction["direction"];
    amount: number;
    daysAgo: number;
    note?: string;
    address?: string;
  }[] = [
    { user: "adaeze", asset: "USDT", type: "deposit", direction: "credit", amount: 5000, daysAgo: 40 },
    { user: "adaeze", asset: "BTC", type: "deposit", direction: "credit", amount: 0.0821, daysAgo: 38 },
    { user: "adaeze", asset: "ETH", type: "deposit", direction: "credit", amount: 1.94, daysAgo: 36 },
    { user: "adaeze", asset: "USDT", type: "withdrawal", direction: "debit", amount: 900, daysAgo: 12, note: "Paid out", address: sampleAddress("USDT", "trc20") },
    { user: "chidi", asset: "USDT", type: "deposit", direction: "credit", amount: 1500, daysAgo: 30 },
    { user: "chidi", asset: "ETH", type: "deposit", direction: "credit", amount: 0.8, daysAgo: 26 },
    { user: "chidi", asset: "ETH", type: "withdrawal", direction: "debit", amount: 0.18, daysAgo: 9, note: "Paid out", address: sampleAddress("ETH", "erc20") },
    { user: "zainab", asset: "BTC", type: "deposit", direction: "credit", amount: 0.2044, daysAgo: 21 },
    { user: "zainab", asset: "USDT", type: "deposit", direction: "credit", amount: 12_000, daysAgo: 18 },
    { user: "zainab", asset: "USDT", type: "bonus", direction: "credit", amount: 250, daysAgo: 14, note: "Welcome bonus (demo)" },
    { user: "tunde", asset: "USDT", type: "deposit", direction: "credit", amount: 800, daysAgo: 14 },
    { user: "tunde", asset: "BTC", type: "deposit", direction: "credit", amount: 0.0042, daysAgo: 11 },
    { user: "grace", asset: "ETH", type: "deposit", direction: "credit", amount: 0.05, daysAgo: 6 },
    { user: "kemi", asset: "USDT", type: "bonus", direction: "credit", amount: 1250, daysAgo: 2, note: "Sandbox starter funds" },
  ];

  for (const row of ledger) {
    const user = byUsername(row.user);
    const balances = balancesFor(db, user.id);
    pushTransaction(db, {
      user_id: user.id,
      asset: row.asset,
      type: row.type,
      direction: row.direction,
      amount: row.amount,
      balance_after: roundAsset(row.asset, balances[row.asset]),
      status: "completed",
      reference: newReference(),
      wallet_address: row.address ?? null,
      note: row.note ?? null,
      created_at: days(row.daysAgo),
    });
  }

  // ── Withdrawal requests in every state ───────────────────────────────
  const requests: {
    user: string;
    asset: Asset;
    amount: number;
    network: string;
    status: Withdrawal["status"];
    daysAgo: number;
    note?: string;
  }[] = [
    { user: "adaeze", asset: "USDT", amount: 900, network: "trc20", status: "approved", daysAgo: 12, note: "Verified address, released." },
    { user: "chidi", asset: "ETH", amount: 0.18, network: "erc20", status: "approved", daysAgo: 9 },
    { user: "zainab", asset: "BTC", amount: 0.05, network: "bitcoin", status: "pending", daysAgo: 1 },
    { user: "tunde", asset: "USDT", amount: 240, network: "trc20", status: "pending", daysAgo: 0.4 },
    { user: "grace", asset: "USDT", amount: 120, network: "bep20", status: "rejected", daysAgo: 4, note: "Address failed network check — refunded to balance." },
  ];

  for (const r of requests) {
    const user = byUsername(r.user);
    const meta = assetMeta(r.asset);
    const fee = meta.fee;
    const payout = roundAsset(r.asset, Math.max(0, r.amount - fee));
    const reviewed = r.status !== "pending";
    db.withdrawals.unshift({
      id: newId("wd"),
      user_id: user.id,
      username: user.username,
      asset: r.asset,
      amount: r.amount,
      fee,
      payout,
      network: r.network,
      wallet_address: sampleAddress(r.asset, r.network),
      status: r.status,
      admin_note: r.note ?? null,
      reviewed_by: reviewed ? admin.id : null,
      reviewed_at: reviewed ? days(Math.max(0, r.daysAgo - 0.5)) : null,
      reference: newReference(),
      created_at: days(r.daysAgo),
    });
  }

  // ── Support conversations ────────────────────────────────────────────
  const conversations: {
    user: string;
    subject: string;
    status: SupportThread["status"];
    daysAgo: number;
    exchange: { role: "user" | "admin"; body: string; hoursAgo: number }[];
  }[] = [
    {
      user: "zainab",
      subject: "Status of my BTC withdrawal",
      status: "open",
      daysAgo: 1,
      exchange: [
        { role: "user", body: "Hi, I requested a 0.05 BTC withdrawal yesterday. It still shows Pending — is that normal?", hoursAgo: 26 },
        { role: "admin", body: "Hello Zainab, thanks for reaching out. Demo withdrawals stay Pending until an admin reviews them. I can see yours in the queue now.", hoursAgo: 22 },
        { role: "user", body: "Perfect, thank you. How long does the review usually take?", hoursAgo: 5 },
      ],
    },
    {
      user: "tunde",
      subject: "How do I change my wallet address?",
      status: "answered",
      daysAgo: 3,
      exchange: [
        { role: "user", body: "I typed the wrong TRC-20 address on a request. Can I edit it?", hoursAgo: 70 },
        { role: "admin", body: "Cancel the pending request from Dashboard → Withdrawals, then submit a new one with the correct address. Funds return to your balance instantly on cancel.", hoursAgo: 66 },
        { role: "user", body: "Worked. Thanks!", hoursAgo: 60 },
      ],
    },
    {
      user: "grace",
      subject: "Why was my withdrawal rejected?",
      status: "closed",
      daysAgo: 4,
      exchange: [
        { role: "user", body: "My USDT request was rejected. Did I lose the money?", hoursAgo: 96 },
        { role: "admin", body: "No — rejected requests are reversed automatically. Your balance was restored and you'll see a Refund entry in your transaction history.", hoursAgo: 92 },
      ],
    },
  ];

  for (const c of conversations) {
    const user = byUsername(c.user);
    const threadId = newId("thr");
    const lastHours = Math.min(...c.exchange.map((e) => e.hoursAgo));
    db.threads.unshift({
      id: threadId,
      user_id: user.id,
      username: user.username,
      subject: c.subject,
      status: c.status,
      message_count: c.exchange.length,
      last_message_at: new Date(now - lastHours * 3600_000).toISOString(),
      created_at: days(c.daysAgo),
    });
    for (const m of c.exchange) {
      db.messages.push({
        id: newId("msg"),
        thread_id: threadId,
        sender_role: m.role,
        sender_name: m.role === "admin" ? admin.full_name ?? "Support" : (user.full_name ?? user.username),
        body: m.body,
        created_at: new Date(now - m.hoursAgo * 3600_000).toISOString(),
      });
    }
  }

  db.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  db.transactions.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
