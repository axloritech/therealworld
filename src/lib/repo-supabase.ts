import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ASSETS, HAS_SERVICE_ROLE, assetMeta } from "./config";
import { FAQ_ITEMS } from "./faq";
import { createAdminClient } from "./supabase/admin";
import { createSessionClient } from "./supabase/server";
import type { Repo } from "./repo";
import type {
  AdminStats,
  Asset,
  Balances,
  FaqItem,
  Profile,
  Role,
  SupportMessage,
  SupportThread,
  ThreadStatus,
  Transaction,
  TransactionType,
  Withdrawal,
  WithdrawalStatus,
} from "./types";

/* ═══════════════════════════════════════════════════════════════════════
   Supabase implementation of the Repo contract.

   • All money movement goes through SECURITY DEFINER Postgres functions so
     balance checks and ledger writes stay atomic inside the database.
   • When the service-role key is present, privileged server paths use it;
     otherwise the caller's own JWT is used and row-level security does the
     filtering. Either way the browser only ever holds the anon key.
   ═══════════════════════════════════════════════════════════════════════ */

type Row = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function txt(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function fail(message?: string | null, fallback = "Something went wrong. Please try again."): never {
  throw new Error(clean(message) || fallback);
}

/** Supabase/Postgres errors are often wrapped — surface the useful part. */
function clean(message?: string | null): string {
  const raw = String(message ?? "").trim();
  if (!raw) return "";
  const patterns = [
    /duplicate key value violates unique constraint "([^"]+)"/i,
    /new row for relation "([^"]+)" violates/i,
  ];
  if (patterns[0].test(raw)) {
    const which = raw.match(patterns[0])?.[1] ?? "";
    if (which.includes("username")) return "That username is already taken.";
    if (which.includes("email")) return "That email is already registered.";
    return "That value is already in use.";
  }
  // Strip Postgres context lines for a tidy UI message.
  return raw.split("\n")[0].replace(/^error:\s*/i, "");
}

function mapProfile(row: Row): Profile {
  return {
    id: String(row.id),
    username: String(row.username ?? "").toLowerCase(),
    email: String(row.email ?? "").toLowerCase(),
    full_name: txt(row.full_name),
    role: (row.role === "admin" ? "admin" : "user") as Role,
    phone: txt(row.phone),
    country: txt(row.country),
    avatar_url: txt(row.avatar_url),
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    last_seen_at: txt(row.last_seen_at),
  };
}

function mapTransaction(row: Row): Transaction {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    asset: (row.asset as Asset) ?? "USDT",
    type: (row.type as TransactionType) ?? "deposit",
    direction: (row.direction === "credit" ? "credit" : "debit") as Transaction["direction"],
    amount: num(row.amount),
    balance_after: row.balance_after === null ? null : num(row.balance_after),
    status: (txt(row.status) as Transaction["status"]) ?? "completed",
    reference: txt(row.reference),
    wallet_address: txt(row.wallet_address),
    note: txt(row.note),
    created_at: String(row.created_at),
  };
}

function usernameOf(row: Row): string {
  const embedded = row.profiles as Row | Row[] | null | undefined;
  if (Array.isArray(embedded) && embedded.length > 0) return String(embedded[0]?.username ?? "");
  if (embedded && typeof embedded === "object") return String((embedded as Row).username ?? "");
  return String(row.username ?? "");
}

function mapWithdrawal(row: Row): Withdrawal {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    username: usernameOf(row),
    asset: (row.asset as Asset) ?? "USDT",
    amount: num(row.amount),
    fee: num(row.fee),
    payout: num(row.payout),
    network: String(row.network ?? ""),
    wallet_address: String(row.wallet_address ?? ""),
    status: (txt(row.status) as WithdrawalStatus) ?? "pending",
    admin_note: txt(row.admin_note),
    reviewed_by: txt(row.reviewed_by),
    reviewed_at: txt(row.reviewed_at),
    reference: String(row.reference ?? ""),
    created_at: String(row.created_at),
  };
}

function mapThread(row: Row): SupportThread {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    username: usernameOf(row),
    subject: String(row.subject ?? ""),
    status: (txt(row.status) as ThreadStatus) ?? "open",
    message_count: num(row.message_count),
    last_message_at: String(row.last_message_at ?? row.created_at),
    created_at: String(row.created_at),
  };
}

function mapMessage(row: Row): SupportMessage {
  return {
    id: String(row.id),
    thread_id: String(row.thread_id),
    sender_role: (row.sender_role === "admin" ? "admin" : "user") as Role,
    sender_name: String(row.sender_name ?? "Support"),
    body: String(row.body ?? ""),
    created_at: String(row.created_at),
  };
}

function blankBalances(): Balances {
  return { BTC: 0, ETH: 0, USDT: 0 };
}

export class SupabaseRepo implements Repo {
  readonly kind = "supabase" as const;

  /** Privileged client when the service-role key exists, else the caller's JWT. */
  private async db(): Promise<SupabaseClient> {
    if (HAS_SERVICE_ROLE) return createAdminClient();
    return createSessionClient();
  }

  /* ── Accounts ─────────────────────────────────────────────── */

  async findProfileById(id: string): Promise<Profile | null> {
    const db = await this.db();
    const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) fail(error.message);
    return data ? mapProfile(data as Row) : null;
  }

  async findProfileByUsername(username: string): Promise<Profile | null> {
    const db = await this.db();
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapProfile(data as Row) : null;
  }

  async findProfileByEmail(email: string): Promise<Profile | null> {
    const db = await this.db();
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .ilike("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapProfile(data as Row) : null;
  }

  async findProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
    const out: Record<string, Profile> = {};
    if (ids.length === 0) return out;
    const db = await this.db();
    const { data, error } = await db.from("profiles").select("*").in("id", ids);
    if (error) fail(error.message);
    for (const row of (data ?? []) as Row[]) {
      const profile = mapProfile(row);
      out[profile.id] = profile;
    }
    return out;
  }

  async usernameTaken(username: string): Promise<boolean> {
    if (!HAS_SERVICE_ROLE) {
      const db = await this.db();
      const { data } = await db
        .rpc("check_username_available", { p_username: username.trim().toLowerCase() })
        .single<boolean>();
      return data === false;
    }
    return (await this.findProfileByUsername(username)) !== null;
  }

  async emailTaken(email: string): Promise<boolean> {
    return (await this.findProfileByEmail(email)) !== null;
  }

  async listProfiles(opts?: {
    q?: string;
    role?: Role;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Profile[]; total: number }> {
    const db = await this.db();
    let query = db
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);

    if (opts?.role) query = query.eq("role", opts.role);
    const q = opts?.q?.trim();
    if (q) {
      const like = `%${q.replace(/[,%()]/g, "")}%`;
      query = query.or(`username.ilike.${like},email.ilike.${like},full_name.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) fail(error.message);
    return { rows: (data ?? []).map((r) => mapProfile(r as Row)), total: count ?? data?.length ?? 0 };
  }

  async createProfile(input: {
    id: string;
    username: string;
    email: string;
    full_name?: string | null;
    role?: Role;
  }): Promise<Profile> {
    const db = await this.db();
    const { data, error } = await db
      .from("profiles")
      .upsert(
        {
          id: input.id,
          username: input.username.trim().toLowerCase(),
          email: input.email.trim().toLowerCase(),
          full_name: input.full_name ?? null,
          role: input.role ?? "user",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();
    if (error) fail(error.message);
    return mapProfile(data as Row);
  }

  async updateProfile(id: string, patch: Partial<Pick<Profile, "full_name" | "phone" | "country" | "avatar_url" | "is_active">>): Promise<Profile | null> {
    const db = await this.db();
    const { data, error } = await db
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapProfile(data as Row) : null;
  }

  async setRole(id: string, role: Role): Promise<void> {
    const db = await this.db();
    const { error } = await db.rpc("admin_set_role", { p_user_id: id, p_role: role });
    if (error) fail(error.message);
  }

  async setPassword(userId: string, password: string): Promise<boolean> {
    if (!HAS_SERVICE_ROLE) return false;
    const db = await this.db();
    const { error } = await db.auth.admin.updateUserById(userId, { password });
    return !error;
  }

  /* ── Balances ─────────────────────────────────────────────── */

  async getBalances(userId: string): Promise<Balances> {
    const db = await this.db();
    const { data, error } = await db.from("balances").select("asset, amount").eq("user_id", userId);
    if (error) fail(error.message);
    const out = blankBalances();
    for (const row of (data ?? []) as Row[]) {
      const asset = row.asset as Asset;
      if (ASSETS.includes(asset)) out[asset] = num(row.amount);
    }
    return out;
  }

  async getBalancesFor(userIds: string[]): Promise<Record<string, Balances>> {
    const result: Record<string, Balances> = {};
    for (const id of userIds) result[id] = blankBalances();
    if (userIds.length === 0) return result;

    const db = await this.db();
    const { data, error } = await db
      .from("balances")
      .select("user_id, asset, amount")
      .in("user_id", userIds);
    if (error) fail(error.message);
    for (const row of (data ?? []) as Row[]) {
      const uid = String(row.user_id);
      const asset = row.asset as Asset;
      if (!ASSETS.includes(asset)) continue;
      result[uid] = result[uid] ?? blankBalances();
      result[uid][asset] = num(row.amount);
    }
    return result;
  }

  async totalBalances(): Promise<Balances> {
    const db = await this.db();
    const { data, error } = await db.from("balances").select("asset, amount");
    if (error) fail(error.message);
    const totals = blankBalances();
    for (const row of (data ?? []) as Row[]) {
      const asset = row.asset as Asset;
      if (ASSETS.includes(asset)) totals[asset] += num(row.amount);
    }
    for (const a of ASSETS) totals[a] = Math.round(totals[a] * 1e8) / 1e8;
    return totals;
  }

  async setBalance(
    userId: string,
    asset: Asset,
    amount: number,
    opts: { note?: string; actorId?: string | null },
  ): Promise<Balances> {
    const db = await this.db();
    const { error } = await db.rpc("admin_set_balance", {
      p_user_id: userId,
      p_asset: asset,
      p_amount: amount,
      p_note: opts.note ?? "Balance set by administrator",
      // The service-role client carries no JWT subject, so the actor is passed
      // explicitly and the function falls back to auth.uid() when it is null.
      p_admin_id: opts.actorId ?? null,
    });
    if (error) fail(error.message, "Could not update that balance.");
    return this.getBalances(userId);
  }

  /* ── Transactions ─────────────────────────────────────────── */

  async creditFunds(
    userId: string,
    asset: Asset,
    amount: number,
    opts: { type?: "deposit" | "bonus" | "treasury"; note?: string },
  ): Promise<{ balances: Balances; reference: string }> {
    const db = await this.db();
    const { data, error } = await db.rpc("credit_funds", {
      p_user_id: userId,
      p_asset: asset,
      p_amount: amount,
      p_type: opts.type ?? "deposit",
      p_note: opts.note ?? "Demo deposit credited instantly",
    });
    if (error) fail(error.message, "Could not credit those funds.");
    const reference = typeof data === "string" ? data : String((data as Row | null)?.reference ?? "");
    return { balances: await this.getBalances(userId), reference };
  }

  async listTransactions(
    userId: string | null,
    opts?: { asset?: Asset; limit?: number; offset?: number },
  ): Promise<Transaction[]> {
    const db = await this.db();
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    let query = db
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (userId) query = query.eq("user_id", userId);
    if (opts?.asset) query = query.eq("asset", opts.asset);
    const { data, error } = await query;
    if (error) fail(error.message);
    return (data ?? []).map((r) => mapTransaction(r as Row));
  }

  /* ── Withdrawals ──────────────────────────────────────────── */

  async createWithdrawal(input: {
    userId: string;
    asset: Asset;
    amount: number;
    fee: number;
    payout: number;
    network: string;
    walletAddress: string;
  }): Promise<Withdrawal> {
    const db = await this.db();
    const { data, error } = await db.rpc("request_withdrawal", {
      p_asset: input.asset,
      p_amount: input.amount,
      p_network: input.network,
      p_address: input.walletAddress.trim(),
    });
    if (error) fail(error.message, "We could not create that withdrawal request.");
    const row = await this.getWithdrawal(String(data));
    if (!row) fail(null, "Withdrawal request created but could not be read back.");
    return row!;
  }

  async listWithdrawals(opts?: {
    userId?: string;
    status?: WithdrawalStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Withdrawal[]; total: number }> {
    const db = await this.db();
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    let query = db
      .from("withdrawals")
      .select("*, profiles(username)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (opts?.userId) query = query.eq("user_id", opts.userId);
    if (opts?.status) query = query.eq("status", opts.status);
    const q = opts?.q?.trim();
    if (q) {
      const like = `%${q.replace(/[,%()]/g, "")}%`;
      query = query.or(`reference.ilike.${like},wallet_address.ilike.${like}`);
    }
    const { data, error, count } = await query;
    if (error) fail(error.message);
    let rows = (data ?? []).map((r) => mapWithdrawal(r as Row));
    if (q) {
      // Username filtering happens in memory because it lives on a joined row.
      const needle = q.toLowerCase();
      const profileLookup = await this.listProfiles({ q, limit: 200 });
      const ids = new Set(profileLookup.rows.map((p) => p.id));
      rows = rows.filter((w) => w.username.toLowerCase().includes(needle) || ids.has(w.user_id));
    }
    return { rows, total: count ?? rows.length };
  }

  async getWithdrawal(id: string): Promise<Withdrawal | null> {
    const db = await this.db();
    const { data, error } = await db
      .from("withdrawals")
      .select("*, profiles(username)")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapWithdrawal(data as Row) : null;
  }

  async reviewWithdrawal(
    id: string,
    status: Exclude<WithdrawalStatus, "pending">,
    opts: { adminId: string; note?: string },
  ): Promise<Withdrawal | null> {
    const db = await this.db();
    const { error } = await db.rpc("admin_review_withdrawal", {
      p_id: id,
      p_status: status,
      p_note: opts.note ?? null,
      p_admin_id: opts.adminId ?? null,
    });
    if (error) fail(error.message, `Could not mark this request as ${status}.`);
    return this.getWithdrawal(id);
  }

  /** Users cancel their own pending request through the same RPC path. */
  async cancelWithdrawal(id: string, userId: string): Promise<Withdrawal | null> {
    const db = await this.db();
    const { error } = await db.rpc("cancel_withdrawal", { p_id: id, p_user_id: userId });
    if (error) fail(error.message, "Could not cancel that request.");
    return this.getWithdrawal(id);
  }

  /* ── Support ──────────────────────────────────────────────── */

  async listThreads(opts?: {
    userId?: string;
    status?: ThreadStatus;
    q?: string;
    limit?: number;
  }): Promise<SupportThread[]> {
    const db = await this.db();
    let query = db
      .from("support_threads")
      .select("*, profiles(username)")
      .order("last_message_at", { ascending: false })
      .limit(opts?.limit ?? 100);
    if (opts?.userId) query = query.eq("user_id", opts.userId);
    if (opts?.status) query = query.eq("status", opts.status);
    const q = opts?.q?.trim();
    if (q) query = query.ilike("subject", `%${q.replace(/[,%()]/g, "")}%`);
    const { data, error } = await query;
    if (error) fail(error.message);
    return (data ?? []).map((r) => mapThread(r as Row));
  }

  async getThread(id: string): Promise<SupportThread | null> {
    const db = await this.db();
    const { data, error } = await db
      .from("support_threads")
      .select("*, profiles(username)")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapThread(data as Row) : null;
  }

  async listMessages(threadId: string): Promise<SupportMessage[]> {
    const db = await this.db();
    const { data, error } = await db
      .from("support_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (error) fail(error.message);
    return (data ?? []).map((r) => mapMessage(r as Row));
  }

  async createThread(input: {
    userId: string;
    username: string;
    subject: string;
    body: string;
  }): Promise<SupportThread> {
    const db = await this.db();
    const { data, error } = await db.rpc("create_support_thread", {
      p_subject: input.subject.trim(),
      p_body: input.body.trim(),
      p_user_id: input.userId,
    });
    if (error) fail(error.message, "Could not start that conversation.");
    const thread = await this.getThread(String(data));
    if (!thread) fail(null, "Conversation started but could not be read back.");
    return thread!;
  }

  async addMessage(input: {
    threadId: string;
    senderRole: Role;
    senderName: string;
    senderId: string;
    body: string;
  }): Promise<SupportMessage | null> {
    const db = await this.db();
    const { data, error } = await db.rpc("send_support_message", {
      p_thread_id: input.threadId,
      p_body: input.body.trim(),
      p_user_id: input.senderId,
    });
    if (error) fail(error.message, "Could not send that message.");
    const { data: row } = await db
      .from("support_messages")
      .select("*")
      .eq("id", String(data))
      .maybeSingle();
    return row ? mapMessage(row as Row) : null;
  }

  async setThreadStatus(id: string, status: ThreadStatus): Promise<void> {
    const db = await this.db();
    // Routed through the RPC: it enforces "owner or admin" and refuses
    // statuses the workflow does not allow, instead of relying on RLS alone.
    const { error } = await db.rpc("set_thread_status", { p_id: id, p_status: status });
    if (error) fail(error.message, "Could not update that conversation.");
  }

  /* ── Content & stats ──────────────────────────────────────── */

  async listFaqs(): Promise<FaqItem[]> {
    const db = await this.db();
    const { data, error } = await db
      .from("faqs")
      .select("id, category, question, answer, position")
      .order("position", { ascending: true });
    if (error || !data || data.length === 0) return FAQ_ITEMS;
    return data.map((r) => {
      const row = r as Row;
      return {
        id: String(row.id),
        category: String(row.category ?? "General"),
        question: String(row.question ?? ""),
        answer: String(row.answer ?? ""),
      };
    });
  }

  async adminStats(): Promise<AdminStats> {
    const db = await this.db();
    const [users, withdrawals, threads, txCount, balances, treasuryRows] = await Promise.all([
      db.from("profiles").select("id, role", { count: "exact", head: false }),
      db.from("withdrawals").select("status, payout, asset"),
      db.from("support_threads").select("status", { count: "exact", head: false }),
      db.from("transactions").select("id", { count: "exact", head: true }),
      this.totalBalances(),
      db.from("transactions").select("amount, asset").eq("type", "treasury"),
    ]);

    const allUsers = (users.data ?? []) as Row[];
    const rows = (withdrawals.data ?? []) as Row[];
    const countStatus = (s: WithdrawalStatus) => rows.filter((r) => r.status === s).length;
    const threadRows = (threads.data ?? []) as Row[];

    return {
      users: allUsers.filter((u) => u.role !== "admin").length,
      pending_withdrawals: countStatus("pending"),
      approved_withdrawals: countStatus("approved"),
      rejected_withdrawals: countStatus("rejected"),
      open_threads: threadRows.filter((t) => t.status !== "closed").length,
      transactions: txCount.count ?? 0,
      balances,
      withdrawal_volume: rows
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => {
          const asset = (r.asset as Asset) ?? "USDT";
          return sum + num(r.payout) * assetMeta(asset).price;
        }, 0),
      treasury_sent_usd: ((treasuryRows.data ?? []) as Row[]).reduce((sum, r) => {
        const asset = (r.asset as Asset) ?? "USDT";
        return sum + num(r.amount) * assetMeta(asset).price;
      }, 0),
    };
  }
}
