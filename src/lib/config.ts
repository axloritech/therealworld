import type { Asset, Role } from "./types";

/* ───────────────────────── Environment ───────────────────────── */

function str(key: string, fallback = ""): string {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

export const SUPABASE_URL = str("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = str("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = str("SUPABASE_SERVICE_ROLE_KEY");

/** True once a real Supabase project is wired up. Otherwise we run the local sandbox. */
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Service-role access enables privileged server-side operations. */
export const HAS_SERVICE_ROLE = Boolean(HAS_SUPABASE && SUPABASE_SERVICE_ROLE_KEY);

export const SITE = {
  name: str("NEXT_PUBLIC_SITE_NAME", "The Real World"),
  url: str("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  /** Empty by design — the logo slots stay blank until you supply your own art. */
  logoUrl: str("NEXT_PUBLIC_LOGO_URL", ""),
  logoMarkUrl: str("NEXT_PUBLIC_LOGO_MARK_URL", ""),
};

/* Cosmetic figure shown on the admin overview: one trillion US dollars of
 * demonstration credit. It is deliberately not part of any ledger, balance or
 * statistic — nothing in the sandbox can actually hold or move this amount. */
export const ADMIN_MOCK_BALANCE_USD = 1_000_000_000_000;

/** Emails auto-promoted to admin when they register. */
export const ADMIN_EMAILS: string[] = str("ADMIN_EMAILS")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const DEMO_SEED = bool("DEMO_SEED", true);

/* ───────────────────────── Hero video ───────────────────────── */

/**
 * Accepts a bare video ID, a watch URL, a youtu.be short link, or an embed URL.
 * Returns null when nothing is configured (the hero then renders a poster panel
 * with the same aspect ratio, so the layout never jumps).
 */
export function resolveYouTubeId(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live");
      const id = embedIdx >= 0 ? parts[embedIdx + 1] : undefined;
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {
    /* not a URL — fall through */
  }
  return null;
}

export const YOUTUBE_ID = resolveYouTubeId(str("NEXT_PUBLIC_YOUTUBE_VIDEO_ID"));
export const YOUTUBE_TITLE = str(
  "NEXT_PUBLIC_YOUTUBE_TITLE",
  `${SITE.name} — platform overview`,
);

/* ───────────────────────── Assets ───────────────────────── */

export const ASSETS = ["BTC", "ETH", "USDT"] as const;

export interface AssetMeta {
  symbol: Asset;
  name: string;
  decimals: number;
  /** Accent used for the asset tile / badge. */
  tint: string;
  glyph: string;
  networks: { id: string; label: string; confirmations: number }[];
  minWithdraw: number;
  maxWithdraw: number;
  /** Flat demo network fee, denominated in the asset itself. */
  fee: number;
  /** Static demo reference price in USD. */
  price: number;
}

export const ASSET_META: Record<Asset, AssetMeta> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    tint: "#f7c455",
    glyph: "₿",
    networks: [{ id: "bitcoin", label: "Bitcoin (BTC)", confirmations: 2 }],
    minWithdraw: 0.0005,
    maxWithdraw: 5,
    fee: 0.0002,
    price: 68_250,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 6,
    tint: "#a5b4fc",
    glyph: "Ξ",
    networks: [
      { id: "erc20", label: "Ethereum (ERC-20)", confirmations: 12 },
      { id: "arbitrum", label: "Arbitrum One", confirmations: 12 },
    ],
    minWithdraw: 0.01,
    maxWithdraw: 200,
    fee: 0.004,
    price: 3_540,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 2,
    tint: "#4ade80",
    glyph: "₮",
    networks: [
      { id: "trc20", label: "Tron (TRC-20)", confirmations: 19 },
      { id: "erc20", label: "Ethereum (ERC-20)", confirmations: 12 },
      { id: "bep20", label: "BNB Smart Chain (BEP-20)", confirmations: 15 },
    ],
    minWithdraw: 20,
    maxWithdraw: 100_000,
    fee: 1,
    price: 1,
  },
};

/** Opening balances handed to every new sandbox account. */
export const STARTER_BALANCES: Record<Asset, number> = {
  BTC: 0.025,
  ETH: 0.45,
  USDT: 1_250,
};

export function assetMeta(a: Asset): AssetMeta {
  return ASSET_META[a] ?? ASSET_META.USDT;
}

export function isAsset(v: unknown): v is Asset {
  return typeof v === "string" && (ASSETS as readonly string[]).includes(v);
}

export function usdValue(balances: Record<Asset, number>): number {
  return ASSETS.reduce((sum, a) => sum + (balances[a] ?? 0) * assetMeta(a).price, 0);
}

/* ───────────────────────── Roles ───────────────────────── */

export const ROLES: Role[] = ["user", "admin"];

export function isRole(v: unknown): v is Role {
  return v === "user" || v === "admin";
}

export function isAutoAdminEmail(email: string | null | undefined): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/* ───────────────────────── Limits ───────────────────────── */

/** Sandbox top-up limits per asset. */
export const DEPOSIT_LIMITS: Record<Asset, { min: number; max: number }> = {
  BTC: { min: 0.0001, max: 10 },
  ETH: { min: 0.001, max: 500 },
  USDT: { min: 1, max: 1_000_000 },
};

export const LIMITS = {
  username: { min: 3, max: 20 },
  password: { min: 8, max: 128 },
  subject: { min: 3, max: 120 },
  message: { min: 1, max: 4000 },
  address: { min: 10, max: 128 },
};
