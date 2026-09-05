/**
 * Shared domain types.
 *
 * The same shapes are produced by both data backends:
 *   • Supabase (production)  — see supabase/migrations
 *   • Demo store (local)     — see src/lib/repo-demo.ts
 */

export type Asset = "BTC" | "ETH" | "USDT";
export type Role = "user" | "admin";
export type Direction = "credit" | "debit";

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "cancelled";

export type TransactionType =
  | "deposit"
  | "bonus"
  | "treasury"
  | "withdrawal"
  | "withdrawal_reversal"
  | "admin_adjust"
  | "trade";

export type ThreadStatus = "open" | "answered" | "closed";

/** A registered account + profile row. */
export interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: Role;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

/** Per-asset balance for a user. Always returns all three assets. */
export type Balances = Record<Asset, number>;

export interface Transaction {
  id: string;
  user_id: string;
  asset: Asset;
  type: TransactionType;
  direction: Direction;
  amount: number;
  balance_after: number | null;
  status: "completed" | "pending" | "reversed";
  reference: string | null;
  wallet_address: string | null;
  note: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  username: string;
  asset: Asset;
  amount: number;
  fee: number;
  payout: number;
  network: string;
  wallet_address: string;
  status: WithdrawalStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reference: string;
  created_at: string;
}

export interface SupportThread {
  id: string;
  user_id: string;
  username: string;
  subject: string;
  status: ThreadStatus;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  sender_role: Role;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface AdminStats {
  users: number;
  pending_withdrawals: number;
  approved_withdrawals: number;
  rejected_withdrawals: number;
  open_threads: number;
  transactions: number;
  balances: Balances;
  withdrawal_volume: number;
  /** USD value of everything sent out of the mock admin treasury. */
  treasury_sent_usd: number;
}

export interface SessionUser {
  profile: Profile;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };
