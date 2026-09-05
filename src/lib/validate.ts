import { ASSETS, LIMITS, assetMeta, isAsset } from "./config";
import type { Asset } from "./types";

export type FieldErrors = Record<string, string>;

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Usernames are unique, lowercase, 3–20 chars: letters, digits, dot, dash, underscore. */
export function validateUsername(raw: unknown): string | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return "Username is required.";
  if (value.length < LIMITS.username.min)
    return `Username must be at least ${LIMITS.username.min} characters.`;
  if (value.length > LIMITS.username.max)
    return `Username must be at most ${LIMITS.username.max} characters.`;
  if (!USERNAME_RE.test(value))
    return "Use letters, numbers, dot, dash or underscore — no spaces or symbols.";
  const reserved = ["admin", "root", "support", "system", "null", "undefined", "www"];
  if (reserved.includes(value)) return "That username is reserved.";
  return null;
}

export function normaliseUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function validateEmail(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return "Email is required.";
  if (value.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(raw: unknown): string | null {
  const value = String(raw ?? "");
  if (!value) return "Password is required.";
  if (value.length < LIMITS.password.min)
    return `Password must be at least ${LIMITS.password.min} characters.`;
  if (value.length > LIMITS.password.max) return "Password is too long.";
  return null;
}

/** Demo-grade strength meter (0–4). No external services. */
export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^\w\s]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

export function validateFullName(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null; // optional
  if (value.length > 80) return "Name is too long.";
  return null;
}

/* ───────────────────────── Wallet addresses ───────────────────────── */

const ADDRESS_PATTERNS: Record<string, RegExp> = {
  // Legacy (1…), nested SegWit (3…), native SegWit (bc1…)
  bitcoin: /^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,62})$/,
  // EVM chains: Ethereum, Arbitrum, BNB Smart Chain
  evm: /^0x[a-fA-F0-9]{40}$/,
  // Tron
  tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
};

const NETWORK_KIND: Record<string, keyof typeof ADDRESS_PATTERNS> = {
  bitcoin: "bitcoin",
  erc20: "evm",
  arbitrum: "evm",
  bep20: "evm",
  trc20: "tron",
};

export function networksFor(asset: Asset) {
  return assetMeta(asset).networks;
}

export function isValidNetwork(asset: Asset, network: string): boolean {
  return networksFor(asset).some((n) => n.id === network);
}

/** Returns an error message, or null when the address is acceptable. */
export function validateAddress(asset: unknown, network: unknown, address: unknown): string | null {
  if (!isAsset(asset)) return "Choose an asset.";
  const net = String(network ?? "");
  const addr = String(address ?? "").trim();

  if (!addr) return "Wallet address is required.";
  if (addr.length < LIMITS.address.min || addr.length > LIMITS.address.max)
    return `Address must be ${LIMITS.address.min}–${LIMITS.address.max} characters.`;
  if (/\s/.test(addr)) return "Address cannot contain spaces.";
  if (!isValidNetwork(asset, net)) return "Choose a supported network for this asset.";

  const kind = NETWORK_KIND[net];
  const pattern = kind ? ADDRESS_PATTERNS[kind] : undefined;
  if (pattern && !pattern.test(addr)) {
    const examples: Record<string, string> = {
      bitcoin: "e.g. bc1q… or 1A1z… or 3J98…",
      evm: "e.g. 0x followed by 40 hex characters",
      tron: "e.g. T followed by 33 base58 characters",
    };
    return `That doesn't look like a valid ${net.toUpperCase()} address (${examples[kind]}).`;
  }
  return null;
}

/** Plausible-looking sandbox addresses, used only to seed the demo store. */
export function sampleAddress(asset: Asset, network?: string): string {
  const net = network && isValidNetwork(asset, network) ? network : networksFor(asset)[0].id;
  const b58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const hex = "0123456789abcdef";
  const pick = (alphabet: string, len: number) =>
    Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  switch (NETWORK_KIND[net]) {
    case "bitcoin":
      return `bc1q${pick(b58.toLowerCase().replace(/[bo]/g, ""), 38)}`;
    case "tron":
      return `T${pick(b58, 33)}`;
    default:
      return `0x${pick(hex, 40)}`;
  }
}

/* ───────────────────────── Amounts ───────────────────────── */

export function roundTo(value: number, asset: Asset): number {
  const d = assetMeta(asset).decimals;
  const f = 10 ** d;
  return Math.round((Number(value) + Number.EPSILON) * f) / f;
}

export function parseAmount(raw: unknown, asset: Asset): number {
  const cleaned = String(raw ?? "")
    .replace(/,/g, "")
    .trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return Number.NaN;
  return roundTo(n, asset);
}

/** Returns an error message, or null when the withdrawal amount is acceptable. */
export function validateAmount(
  rawAmount: unknown,
  asset: Asset,
  available: number,
): { error: string | null; amount: number; fee: number; payout: number } {
  const meta = assetMeta(asset);
  const amount = parseAmount(rawAmount, asset);
  const fee = meta.fee;

  if (Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter an amount greater than zero.", amount: 0, fee, payout: 0 };
  }
  if (amount < meta.minWithdraw) {
    return {
      error: `Minimum withdrawal is ${fmtMin(meta.minWithdraw)} ${asset}.`,
      amount,
      fee,
      payout: 0,
    };
  }
  if (amount > meta.maxWithdraw) {
    return {
      error: `Maximum withdrawal per request is ${fmtMin(meta.maxWithdraw)} ${asset}.`,
      amount,
      fee,
      payout: 0,
    };
  }
  if (amount > available + 1e-12) {
    return {
      error: `Insufficient ${asset} balance. Available: ${fmtMin(available)} ${asset}.`,
      amount,
      fee,
      payout: 0,
    };
  }
  const payout = roundTo(Math.max(0, amount - fee), asset);
  if (payout <= 0) {
    return { error: `Amount must exceed the ${fee} ${asset} network fee.`, amount, fee, payout: 0 };
  }
  return { error: null, amount, fee, payout };
}

function fmtMin(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export function isKnownAsset(v: unknown): v is Asset {
  return isAsset(v);
}

export const ALL_ASSETS = ASSETS;
