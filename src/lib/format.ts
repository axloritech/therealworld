import { ASSET_META, assetMeta } from "./config";
import type { Asset, Direction, ThreadStatus, TransactionType, WithdrawalStatus } from "./types";

/** 1,234.56 with asset-specific precision. */
export function fmtAmount(value: number | null | undefined, asset: Asset): string {
  const decimals = assetMeta(asset).decimals;
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 8),
  });
}

export function fmtUsd(value: number | null | undefined, compact = false): string {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (compact && Math.abs(n) >= 1000) {
    return `$${n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })}`;
  }
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPrice(asset: Asset, price: number): string {
  const n = Number.isFinite(price) ? price : ASSET_META[asset].price;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 10 ? 4 : 2,
    maximumFractionDigits: n < 10 ? 4 : 2,
  });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [604800, "d"],
    [2629800, "w"],
    [31557600, "mo"],
  ];
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  for (let i = 4; i < units.length; i++) {
    if (secs < units[i][0]) return `${Math.floor(secs / units[i - 1][0])}${units[i - 1][1]} ago`;
  }
  return `${Math.floor(secs / 31557600)}y ago`;
}

/** Groups a date into a friendly chat-day heading. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ───────────────────────── Status presentation ───────────────────────── */

export const WITHDRAWAL_STATUS_META: Record<
  WithdrawalStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "Pending",
    className: "border-gold-400/35 bg-gold-400/10 text-gold-300",
    dot: "bg-gold-400",
  },
  approved: {
    label: "Approved",
    className: "border-mint-500/35 bg-mint-500/10 text-mint-400",
    dot: "bg-mint-400",
  },
  rejected: {
    label: "Rejected",
    className: "border-rose-500/35 bg-rose-500/10 text-rose-400",
    dot: "bg-rose-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-line bg-white/[0.04] text-fog",
    dot: "bg-smoke",
  },
};

export const THREAD_STATUS_META: Record<
  ThreadStatus,
  { label: string; className: string }
> = {
  open: { label: "Open", className: "border-flare-500/35 bg-flare-500/10 text-flare-300" },
  answered: { label: "Answered", className: "border-sky-400/35 bg-sky-400/10 text-sky-400" },
  closed: { label: "Closed", className: "border-line bg-white/[0.04] text-fog" },
};

export const TX_TYPE_META: Record<TransactionType, { label: string; className: string }> = {
  deposit: { label: "Deposit", className: "text-mint-400" },
  bonus: { label: "Demo bonus", className: "text-sky-400" },
  withdrawal: { label: "Withdrawal", className: "text-flare-300" },
  withdrawal_reversal: { label: "Refund", className: "text-gold-300" },
  admin_adjust: { label: "Admin adjust", className: "text-mist" },
  treasury: { label: "Treasury send", className: "text-brand-300" },
  trade: { label: "Trade", className: "text-chalk" },
};

export function directionLabel(direction: Direction): string {
  return direction === "credit" ? "+" : "−";
}

/* ───────────────────────── Misc ───────────────────────── */

export function truncate(value: string, max = 42): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function maskAddress(address: string): string {
  if (!address) return "—";
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  const src = (name || "").trim();
  if (!src) return fallback;
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function pctChange(current: number, base: number): number {
  if (!base) return 0;
  return ((current - base) / base) * 100;
}

export function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
