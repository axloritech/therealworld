import "server-only";

import { ASSETS, STARTER_BALANCES, assetMeta } from "./config";
import {
  balancesFor,
  emptyBalances,
  mutateDb,
  newId,
  newReference,
  pushTransaction,
  readDb,
  roundAsset,
  setBalances,
  verifyPassword,
  hashPassword,
  type DemoUser,
} from "./demo-store";
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
  Withdrawal,
  WithdrawalStatus,
} from "./types";
import { FAQ_ITEMS } from "./faq";

/* ═══════════════════════════════════════════════════════════════════════
   Sandbox implementation of the Repo contract, backed by demo-store.ts.
   Mirrors the guarantees of the Postgres RPCs (atomic balance checks,
   automatic refunds on reject/cancel) so behaviour is identical in both
   modes — only the storage engine differs.
   ═══════════════════════════════════════════════════════════════════════ */

function strip(u: DemoUser): Profile {
  const { password_hash: _pw, ...profile } = u;
  void _pw;
  return profile;
}

function lower(v: string | undefined | null): string {
  return (v ?? "").trim().toLowerCase();
}

export class DemoRepo implements Repo {
  readonly kind = "demo" as const;

  /* ── Accounts ─────────────────────────────────────────────── */

  async findProfileById(id: string): Promise<Profile | null> {
    const u = readDb().users.find((x) => x.id === id);
    return u ? strip(u) : null;
  }

  async findProfileByUsername(username: string): Promise<Profile | null> {
    const target = lower(username);
    const u = readDb().users.find((x) => x.username === target);
    return u ? strip(u) : null;
  }

  async findProfileByEmail(email: string): Promise<Profile | null> {
    const target = lower(email);
    const u = readDb().users.find((x) => x.email === target);
    return u ? strip(u) : null;
  }

  async findProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
    const wanted = new Set(ids);
    const out: Record<string, Profile> = {};
    for (const u of readDb().users) if (wanted.has(u.id)) out[u.id] = strip(u);
    return out;
  }

  async usernameTaken(username: string): Promise<boolean> {
    const target = lower(username);
    return readDb().users.some((x) => x.username === target);
  }

  async emailTaken(email: string): Promise<boolean> {
    const target = lower(email);
    return readDb().users.some((x) => x.email === target);
  }

  async listProfiles(opts?: {
    q?: string;
    role?: Role;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Profile[]; total: number }> {
    const db = readDb();
    const q = lower(opts?.q);
    let rows = [...db.users];
    if (opts?.role) rows = rows.filter((u) => u.role === opts.role);
    if (q) {
      rows = rows.filter(
        (u) =>
          u.username.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = rows.length;
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return { rows: rows.slice(offset, offset + limit).map(strip), total };
  }

  async createProfile(input: {
    id?: string;
    username: string;
    email: string;
    full_name?: string | null;
    role?: Role;
    password?: string;
  }): Promise<Profile> {
    const username = lower(input.username);
    const email = lower(input.email);
    if (await this.usernameTaken(username)) throw new Error("That username is already taken.");
    if (await this.emailTaken(email)) throw new Error("That email is already registered.");

    const id = input.id || newId("usr");
    const now = new Date().toISOString();
    return mutateDb((db) => {
      const user: DemoUser = {
        id,
        username,
        email,
        full_name: input.full_name ?? null,
        role: input.role ?? "user",
        phone: null,
        country: null,
        avatar_url: null,
        is_active: true,
        created_at: now,
        last_seen_at: now,
        password_hash: hashPassword(input.password ?? newReference()),
      };
      db.users.push(user);
      setBalances(db, id, { ...STARTER_BALANCES });
      // Opening ledger entry so the history screen is never empty.
      for (const asset of ASSETS) {
        const amount = STARTER_BALANCES[asset];
        if (amount > 0) {
          pushTransaction(db, {
            user_id: id,
            asset,
            type: "bonus",
            direction: "credit",
            amount,
            balance_after: amount,
            status: "completed",
            reference: newReference(),
            wallet_address: null,
            note: "Sandbox starter funds",
            created_at: now,
          });
        }
      }
      return strip(user);
    });
  }

  async updateProfile(
    id: string,
    patch: Partial<Pick<Profile, "full_name" | "phone" | "country" | "avatar_url" | "is_active">>,
  ): Promise<Profile | null> {
    return mutateDb((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      Object.assign(u, patch);
      return strip(u);
    });
  }

  async setRole(id: string, role: Role): Promise<void> {
    mutateDb((db) => {
      const u = db.users.find((x) => x.id === id);
      if (u) u.role = role;
    });
  }

  async setPassword(userId: string, password: string): Promise<boolean> {
    return mutateDb((db) => {
      const u = db.users.find((x) => x.id === userId);
      if (!u) return false;
      u.password_hash = hashPassword(password);
      return true;
    });
  }

  /** Demo-mode credential check (Supabase mode delegates to Supabase Auth). */
  verifyCredentials(identifier: string, password: string): DemoUser | null {
    const target = lower(identifier);
    const db = readDb();
    const u = db.users.find((x) => x.username === target || x.email === target);
    if (!u || !verifyPassword(password, u.password_hash)) return null;
    if (!u.is_active) return null;
    return u;
  }

  touchLastSeen(userId: string) {
    mutateDb((db) => {
      const u = db.users.find((x) => x.id === userId);
      if (u) u.last_seen_at = new Date().toISOString();
    });
  }

  /* ── Balances ─────────────────────────────────────────────── */

  async getBalances(userId: string): Promise<Balances> {
    return balancesFor(readDb(), userId);
  }

  async getBalancesFor(userIds: string[]): Promise<Record<string, Balances>> {
    const db = readDb();
    const out: Record<string, Balances> = {};
    for (const id of userIds) out[id] = balancesFor(db, id);
    return out;
  }

  async totalBalances(): Promise<Balances> {
    const db = readDb();
    const totals = emptyBalances();
    for (const id of Object.keys(db.balances)) {
      const b = balancesFor(db, id);
      for (const a of ASSETS) totals[a] += b[a];
    }
    for (const a of ASSETS) totals[a] = roundAsset(a, totals[a]);
    return totals;
  }

  async setBalance(
    userId: string,
    asset: Asset,
    amount: number,
    opts: { note?: string; actorId?: string | null },
  ): Promise<Balances> {
    return mutateDb((db) => {
      const current = balancesFor(db, userId);
      const next = roundAsset(asset, Math.max(0, amount));
      const delta = roundAsset(asset, next - current[asset]);
      setBalances(db, userId, { ...current, [asset]: next });
      if (Math.abs(delta) > 0) {
        pushTransaction(db, {
          user_id: userId,
          asset,
          type: "admin_adjust",
          direction: delta > 0 ? "credit" : "debit",
          amount: roundAsset(asset, Math.abs(delta)),
          balance_after: next,
          status: "completed",
          reference: newReference(),
          wallet_address: null,
          note: opts.note || `Balance set by administrator`,
        });
      }
      return balancesFor(db, userId);
    });
  }

  /* ── Transactions ─────────────────────────────────────────── */

  async creditFunds(
    userId: string,
    asset: Asset,
    amount: number,
    opts: { type?: "deposit" | "bonus" | "treasury"; note?: string },
  ): Promise<{ balances: Balances; reference: string }> {
    const rounded = roundAsset(asset, amount);
    if (!(rounded > 0)) throw new Error("Enter an amount greater than zero.");
    return mutateDb((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error("Account not found.");
      const balances = balancesFor(db, userId);
      const next = { ...balances, [asset]: roundAsset(asset, balances[asset] + rounded) };
      setBalances(db, userId, next);
      const reference = newReference();
      pushTransaction(db, {
        user_id: userId,
        asset,
        type: opts.type ?? "deposit",
        direction: "credit",
        amount: rounded,
        balance_after: next[asset],
        status: "completed",
        reference,
        wallet_address: null,
        note: opts.note ?? "Demo deposit credited instantly",
      });
      return { balances: balancesFor(db, userId), reference };
    });
  }

  async listTransactions(
    userId: string | null,
    opts?: { asset?: Asset; limit?: number; offset?: number },
  ): Promise<Transaction[]> {
    const db = readDb();
    let rows = userId ? db.transactions.filter((t) => t.user_id === userId) : [...db.transactions];
    if (opts?.asset) rows = rows.filter((t) => t.asset === opts.asset);
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return rows.slice(offset, offset + limit);
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
    return mutateDb((db) => {
      const user = db.users.find((u) => u.id === input.userId);
      if (!user) throw new Error("Account not found.");
      if (!user.is_active) throw new Error("This account is suspended.");

      const balances = balancesFor(db, input.userId);
      const amount = roundAsset(input.asset, input.amount);
      if (!(amount > 0)) throw new Error("Enter an amount greater than zero.");
      if (amount > balances[input.asset] + 1e-12) {
        throw new Error(`Insufficient ${input.asset} balance.`);
      }

      const reference = newReference();
      const withdrawal: Withdrawal = {
        id: newId("wd"),
        user_id: input.userId,
        username: user.username,
        asset: input.asset,
        amount,
        fee: input.fee,
        payout: roundAsset(input.asset, Math.max(0, amount - input.fee)),
        network: input.network,
        wallet_address: input.walletAddress.trim(),
        status: "pending",
        admin_note: null,
        reviewed_by: null,
        reviewed_at: null,
        reference,
        created_at: new Date().toISOString(),
      };

      const next = { ...balances, [input.asset]: roundAsset(input.asset, balances[input.asset] - amount) };
      setBalances(db, input.userId, next);
      db.withdrawals.unshift(withdrawal);
      pushTransaction(db, {
        user_id: input.userId,
        asset: input.asset,
        type: "withdrawal",
        direction: "debit",
        amount,
        balance_after: next[input.asset],
        status: "pending",
        reference,
        wallet_address: withdrawal.wallet_address,
        note: `Withdrawal request · ${withdrawal.network.toUpperCase()} · awaiting review`,
      });
      return withdrawal;
    });
  }

  async listWithdrawals(opts?: {
    userId?: string;
    status?: WithdrawalStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Withdrawal[]; total: number }> {
    const db = readDb();
    let rows = [...db.withdrawals];
    if (opts?.userId) rows = rows.filter((w) => w.user_id === opts.userId);
    if (opts?.status) rows = rows.filter((w) => w.status === opts.status);
    if (opts?.q) {
      const q = lower(opts.q);
      rows = rows.filter(
        (w) =>
          w.username.includes(q) ||
          w.reference.toLowerCase().includes(q) ||
          w.wallet_address.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = rows.length;
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return { rows: rows.slice(offset, offset + limit), total };
  }

  async getWithdrawal(id: string): Promise<Withdrawal | null> {
    return readDb().withdrawals.find((w) => w.id === id) ?? null;
  }

  async reviewWithdrawal(
    id: string,
    status: Exclude<WithdrawalStatus, "pending">,
    opts: { adminId: string; note?: string },
  ): Promise<Withdrawal | null> {
    return mutateDb((db) => {
      const w = db.withdrawals.find((x) => x.id === id);
      if (!w) return null;
      if (w.status !== "pending") throw new Error(`This request is already ${w.status}.`);

      const now = new Date().toISOString();
      w.status = status;
      w.admin_note = opts.note?.trim() || null;
      w.reviewed_by = opts.adminId;
      w.reviewed_at = now;

      const original = db.transactions.find(
        (t) => t.reference === w.reference && t.type === "withdrawal",
      );

      if (status === "approved") {
        if (original) original.status = "completed";
        return w;
      }

      // rejected | cancelled → refund the held amount and reverse the ledger entry.
      const balances = balancesFor(db, w.user_id);
      const next = {
        ...balances,
        [w.asset]: roundAsset(w.asset, balances[w.asset] + w.amount),
      };
      setBalances(db, w.user_id, next);
      if (original) {
        original.status = "reversed";
        original.note = `Reversed — request ${status}`;
      }
      pushTransaction(db, {
        user_id: w.user_id,
        asset: w.asset,
        type: "withdrawal_reversal",
        direction: "credit",
        amount: w.amount,
        balance_after: next[w.asset],
        status: "completed",
        reference: w.reference,
        wallet_address: w.wallet_address,
        note:
          status === "cancelled"
            ? "Request cancelled by user — funds returned"
            : `Request rejected by admin${w.admin_note ? ` — ${w.admin_note}` : ""}`,
        created_at: now,
      });
      return w;
    });
  }

  /* ── Self-service cancellation ────────────────────────────── */

  async cancelWithdrawal(id: string, userId: string): Promise<Withdrawal | null> {
    const existing = readDb().withdrawals.find((w) => w.id === id);
    if (!existing) throw new Error("That request no longer exists.");
    if (existing.user_id !== userId) throw new Error("You can only cancel your own requests.");
    if (existing.status !== "pending") {
      throw new Error(`Only pending requests can be cancelled. This one is ${existing.status}.`);
    }
    return mutateDb((db) => {
      const w = db.withdrawals.find((x) => x.id === id)!;
      const now = new Date().toISOString();
      w.status = "cancelled";
      w.admin_note = "Cancelled by user";
      w.reviewed_by = null;
      w.reviewed_at = now;

      const balances = balancesFor(db, w.user_id);
      const next = { ...balances, [w.asset]: roundAsset(w.asset, balances[w.asset] + w.amount) };
      setBalances(db, w.user_id, next);

      const original = db.transactions.find(
        (t) => t.reference === w.reference && t.type === "withdrawal",
      );
      if (original) {
        original.status = "reversed";
        original.note = "Reversed — request cancelled";
      }
      pushTransaction(db, {
        user_id: w.user_id,
        asset: w.asset,
        type: "withdrawal_reversal",
        direction: "credit",
        amount: w.amount,
        balance_after: next[w.asset],
        status: "completed",
        reference: w.reference,
        wallet_address: w.wallet_address,
        note: "Request cancelled by user — funds returned",
        created_at: now,
      });
      return w;
    });
  }

  /* ── Support ──────────────────────────────────────────────── */

  async listThreads(opts?: {
    userId?: string;
    status?: ThreadStatus;
    q?: string;
    limit?: number;
  }): Promise<SupportThread[]> {
    const db = readDb();
    let rows = [...db.threads];
    if (opts?.userId) rows = rows.filter((t) => t.user_id === opts.userId);
    if (opts?.status) rows = rows.filter((t) => t.status === opts.status);
    if (opts?.q) {
      const q = lower(opts.q);
      rows = rows.filter((t) => t.subject.toLowerCase().includes(q) || t.username.includes(q));
    }
    rows.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
    return rows.slice(0, opts?.limit ?? 100);
  }

  async getThread(id: string): Promise<SupportThread | null> {
    return readDb().threads.find((t) => t.id === id) ?? null;
  }

  async listMessages(threadId: string): Promise<SupportMessage[]> {
    return readDb()
      .messages.filter((m) => m.thread_id === threadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async createThread(input: {
    userId: string;
    username: string;
    subject: string;
    body: string;
  }): Promise<SupportThread> {
    return mutateDb((db) => {
      const now = new Date().toISOString();
      const thread: SupportThread = {
        id: newId("thr"),
        user_id: input.userId,
        username: input.username,
        subject: input.subject.trim(),
        status: "open",
        message_count: 1,
        last_message_at: now,
        created_at: now,
      };
      db.threads.unshift(thread);
      db.messages.push({
        id: newId("msg"),
        thread_id: thread.id,
        sender_role: "user",
        sender_name: input.username,
        body: input.body.trim(),
        created_at: now,
      });
      return thread;
    });
  }

  async addMessage(input: {
    threadId: string;
    senderRole: Role;
    senderName: string;
    senderId: string;
    body: string;
  }): Promise<SupportMessage | null> {
    return mutateDb((db) => {
      const thread = db.threads.find((t) => t.id === input.threadId);
      if (!thread) return null;
      const now = new Date().toISOString();
      const message: SupportMessage = {
        id: newId("msg"),
        thread_id: thread.id,
        sender_role: input.senderRole,
        sender_name: input.senderName,
        body: input.body.trim(),
        created_at: now,
      };
      db.messages.push(message);
      thread.message_count += 1;
      thread.last_message_at = now;
      thread.status = input.senderRole === "admin" ? "answered" : "open";
      return message;
    });
  }

  async setThreadStatus(id: string, status: ThreadStatus): Promise<void> {
    mutateDb((db) => {
      const t = db.threads.find((x) => x.id === id);
      if (t) t.status = status;
    });
  }

  /* ── Content & stats ──────────────────────────────────────── */

  async listFaqs(): Promise<FaqItem[]> {
    return FAQ_ITEMS;
  }

  async adminStats(): Promise<AdminStats> {
    const db = readDb();
    const balances = await this.totalBalances();
    const count = (s: WithdrawalStatus) => db.withdrawals.filter((w) => w.status === s).length;
    return {
      users: db.users.filter((u) => u.role === "user").length,
      pending_withdrawals: count("pending"),
      approved_withdrawals: count("approved"),
      rejected_withdrawals: count("rejected"),
      open_threads: db.threads.filter((t) => t.status !== "closed").length,
      transactions: db.transactions.length,
      balances,
      withdrawal_volume: db.withdrawals
        .filter((w) => w.status === "approved")
        .reduce((sum, w) => sum + w.payout * assetMeta(w.asset).price, 0),
      treasury_sent_usd: db.transactions
        .filter((t) => t.type === "treasury")
        .reduce((sum, t) => sum + t.amount * assetMeta(t.asset).price, 0),
    };
  }
}

export const demoRepo = new DemoRepo();
