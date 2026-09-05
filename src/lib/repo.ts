import "server-only";

import { HAS_SUPABASE } from "./config";
import { DemoRepo } from "./repo-demo";
import { SupabaseRepo } from "./repo-supabase";
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

/**
 * Data-access contract shared by both backends.
 * Every screen in the app talks to this interface and nothing else, so the
 * local sandbox and a real Supabase project are drop-in interchangeable.
 */
export interface Repo {
  readonly kind: "supabase" | "demo";

  /* ── Accounts ─────────────────────────────────────────────── */
  findProfileById(id: string): Promise<Profile | null>;
  findProfileByUsername(username: string): Promise<Profile | null>;
  findProfileByEmail(email: string): Promise<Profile | null>;
  /** Batch lookup used to label ledger rows in the admin console. */
  findProfilesByIds(ids: string[]): Promise<Record<string, Profile>>;
  usernameTaken(username: string): Promise<boolean>;
  emailTaken(email: string): Promise<boolean>;
  listProfiles(opts?: {
    q?: string;
    role?: Role;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Profile[]; total: number }>;
  createProfile(input: {
    id: string;
    username: string;
    email: string;
    full_name?: string | null;
    role?: Role;
    password?: string;
  }): Promise<Profile>;
  updateProfile(
    id: string,
    patch: Partial<Pick<Profile, "full_name" | "phone" | "country" | "avatar_url" | "is_active">>,
  ): Promise<Profile | null>;
  setRole(id: string, role: Role): Promise<void>;
  setPassword(userId: string, password: string): Promise<boolean>;

  /* ── Balances ─────────────────────────────────────────────── */
  getBalances(userId: string): Promise<Balances>;
  getBalancesFor(userIds: string[]): Promise<Record<string, Balances>>;
  totalBalances(): Promise<Balances>;
  setBalance(
    userId: string,
    asset: Asset,
    amount: number,
    opts: { note?: string; actorId?: string | null },
  ): Promise<Balances>;
  /** Credits sandbox funds to an account and writes the matching ledger entry. */
  creditFunds(
    userId: string,
    asset: Asset,
    amount: number,
    opts: { type?: "deposit" | "bonus" | "treasury"; note?: string },
  ): Promise<{ balances: Balances; reference: string }>;

  /* ── Transactions ─────────────────────────────────────────── */
  listTransactions(
    userId: string | null,
    opts?: { asset?: Asset; limit?: number; offset?: number },
  ): Promise<Transaction[]>;

  /* ── Withdrawals ──────────────────────────────────────────── */
  createWithdrawal(input: {
    userId: string;
    asset: Asset;
    amount: number;
    fee: number;
    payout: number;
    network: string;
    walletAddress: string;
  }): Promise<Withdrawal>;
  listWithdrawals(opts?: {
    userId?: string;
    status?: WithdrawalStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Withdrawal[]; total: number }>;
  getWithdrawal(id: string): Promise<Withdrawal | null>;
  reviewWithdrawal(
    id: string,
    status: Exclude<WithdrawalStatus, "pending">,
    opts: { adminId: string; note?: string },
  ): Promise<Withdrawal | null>;
  /** Self-service cancel of a still-pending request; refunds the held amount. */
  cancelWithdrawal(id: string, userId: string): Promise<Withdrawal | null>;

  /* ── Support ──────────────────────────────────────────────── */
  listThreads(opts?: {
    userId?: string;
    status?: ThreadStatus;
    q?: string;
    limit?: number;
  }): Promise<SupportThread[]>;
  getThread(id: string): Promise<SupportThread | null>;
  listMessages(threadId: string): Promise<SupportMessage[]>;
  createThread(input: {
    userId: string;
    username: string;
    subject: string;
    body: string;
  }): Promise<SupportThread>;
  addMessage(input: {
    threadId: string;
    senderRole: Role;
    senderName: string;
    senderId: string;
    body: string;
  }): Promise<SupportMessage | null>;
  setThreadStatus(id: string, status: ThreadStatus): Promise<void>;

  /* ── Content & stats ──────────────────────────────────────── */
  listFaqs(): Promise<FaqItem[]>;
  adminStats(): Promise<AdminStats>;
}

let cached: Repo | null = null;

/** Returns the Supabase-backed repo when configured, otherwise the local sandbox. */
export function getRepo(): Repo {
  if (!cached) cached = HAS_SUPABASE ? new SupabaseRepo() : new DemoRepo();
  return cached;
}

export async function dataMode(): Promise<"supabase" | "demo"> {
  return getRepo().kind;
}
