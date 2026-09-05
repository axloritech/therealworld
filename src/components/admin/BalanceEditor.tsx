"use client";

import { clsx } from "clsx";
import { Coins, Plus, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { useToast } from "@/components/ui/Toast";
import { adminCreditAction, adminSetBalanceAction } from "@/lib/actions/admin";
import { idleForm } from "@/lib/actions/types";
import { ASSETS, assetMeta } from "@/lib/config";
import { fmtAmount, fmtUsd } from "@/lib/format";
import type { Asset, Balances } from "@/lib/types";
import { parseAmount } from "@/lib/validate";

/** Quick-credit presets per asset. */
const QUICK_CREDITS: Record<Asset, number[]> = {
  USDT: [100, 500, 1000],
  BTC: [0.001, 0.01, 0.1],
  ETH: [0.05, 0.5, 2],
};

/**
 * Administrator balance controls: set an absolute demo balance or credit funds.
 * Both write a signed-off ledger entry against the account.
 */
export function BalanceEditor({
  userId,
  username,
  balances,
  adminName,
}: {
  userId: string;
  username: string;
  balances: Balances;
  adminName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [asset, setAsset] = useState<Asset>("USDT");
  const [amount, setAmount] = useState(String(balances.USDT ?? 0));
  const [credit, setCredit] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function selectAsset(next: Asset) {
    setAsset(next);
    setAmount(String(balances[next] ?? 0));
  }

  function run(action: typeof adminSetBalanceAction, fields: Record<string, string>, successPrefix: string) {
    const fd = new FormData();
    fd.set("user_id", userId);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    startTransition(async () => {
      const result = await action(idleForm, fd);
      if (result.ok) toast(result.message ?? `${successPrefix} updated.`, "success");
      else toast(result.error ?? "Could not update that balance.", "error");
      router.refresh();
    });
  }

  const parsed = parseAmount(amount, asset);
  const parsedCredit = parseAmount(credit, asset);
  const setValid = !Number.isNaN(parsed) && parsed >= 0;
  const creditValid = !Number.isNaN(parsedCredit) && parsedCredit > 0;

  return (
    <div className="card overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-line bg-night-900/70 px-5 py-4">
        <SlidersHorizontal className="h-4 w-4 text-gold-400" />
        <h2 className="text-sm font-bold text-chalk">Manage demo balances</h2>
        <span className="ml-auto text-[11px] text-smoke">@{username}</span>
      </header>

      <div className="flex flex-col gap-5 p-5">
        {/* Current balances */}
        <div className="grid grid-cols-3 gap-2.5">
          {ASSETS.map((a) => {
            const selected = a === asset;
            return (
              <button
                key={a}
                type="button"
                onClick={() => selectAsset(a)}
                className={clsx(
                  "flex flex-col items-start gap-1.5 rounded-2xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-gold-400/55 bg-gold-400/[0.08]"
                    : "border-line bg-night-850/60 hover:border-line-strong",
                )}
              >
                <span className="flex items-center gap-2">
                  <AssetIcon asset={a} size={26} />
                  <span className={clsx("text-xs font-bold", selected ? "text-chalk" : "text-mist")}>
                    {a}
                  </span>
                </span>
                <span className="w-full truncate text-xs font-bold text-chalk tabular-nums">
                  {fmtAmount(balances[a] ?? 0, a)}
                </span>
                <span className="text-[10px] text-smoke tabular-nums">
                  {fmtUsd((balances[a] ?? 0) * assetMeta(a).price)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Set absolute balance */}
        <div className="rounded-2xl border border-line bg-night-850/50 p-4">
          <label htmlFor="set-amount" className="label">
            Set {asset} balance to
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="set-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                className="field pr-14 font-bold tabular-nums"
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-fog">
                {asset}
              </span>
            </div>
            <button
              type="button"
              disabled={pending || !setValid}
              onClick={() =>
                run(
                  adminSetBalanceAction,
                  {
                    asset,
                    amount,
                    note: note.trim() || `Balance set by ${adminName}`,
                  },
                  "Balance",
                )
              }
              className="btn-gold sm:w-auto"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {pending ? "Working…" : "Set balance"}
            </button>
          </div>
          <p className="hint">
            Writes an <span className="text-mist">Admin adjust</span> ledger entry with the resulting
            balance and your note.
          </p>
        </div>

        {/* Credit funds */}
        <div className="rounded-2xl border border-line bg-night-850/50 p-4">
          <label htmlFor="credit-amount" className="label">
            Or credit additional {asset}
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="credit-amount"
                type="text"
                inputMode="decimal"
                value={credit}
                onChange={(e) => setCredit(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className="field pr-14 font-bold tabular-nums"
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-fog">
                {asset}
              </span>
            </div>
            <button
              type="button"
              disabled={pending || !creditValid}
              onClick={() =>
                run(
                  adminCreditAction,
                  {
                    asset,
                    credit_amount: credit,
                    note: note.trim() || `Credited by ${adminName}`,
                  },
                  "Balance",
                )
              }
              className="btn-ghost sm:w-auto"
            >
              <Plus className="h-4 w-4 text-mint-400" />
              {pending ? "Working…" : "Credit funds"}
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {QUICK_CREDITS[asset].map((quick) => (
              <button
                key={quick}
                type="button"
                className="chip"
                onClick={() => setCredit(String(quick))}
              >
                +{quick}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label htmlFor="balance-note" className="label">
            Reason recorded on the ledger
          </label>
          <div className="relative">
            <Coins className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="balance-note"
              type="text"
              value={note}
              maxLength={180}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`e.g. Demo top-up approved for @${username}`}
              className="field pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
