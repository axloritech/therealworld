"use client";

import { clsx } from "clsx";
import { ArrowDownToLine, Info } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { depositAction } from "@/lib/actions/funds";
import { idleForm, type FormState } from "@/lib/actions/types";
import { ASSETS, DEPOSIT_LIMITS, assetMeta } from "@/lib/config";
import { fmtAmount, fmtUsd } from "@/lib/format";
import type { Asset, Balances } from "@/lib/types";
import { parseAmount } from "@/lib/validate";

const QUICK: Record<Asset, number[]> = {
  BTC: [0.001, 0.01, 0.05, 0.1],
  ETH: [0.05, 0.25, 1, 5],
  USDT: [100, 500, 1000, 5000],
};

/** Sandbox top-up: credits demo funds instantly and writes a ledger entry. */
export function DepositForm({
  balances,
  defaultAsset,
}: {
  balances: Balances;
  defaultAsset?: Asset;
}) {
  const [state, action] = useActionState<FormState, FormData>(depositAction, idleForm);
  const [asset, setAsset] = useState<Asset>(defaultAsset && ASSETS.includes(defaultAsset) ? defaultAsset : "USDT");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (defaultAsset && ASSETS.includes(defaultAsset)) setAsset(defaultAsset);
  }, [defaultAsset]);

  const meta = assetMeta(asset);
  const limits = DEPOSIT_LIMITS[asset];
  const parsed = useMemo(() => parseAmount(amount, asset), [amount, asset]);
  const valid = !Number.isNaN(parsed) && parsed >= limits.min && parsed <= limits.max;
  const projected = valid ? parsed + (balances[asset] ?? 0) : balances[asset] ?? 0;

  return (
    <form action={action} className="card-lg flex flex-col gap-6 p-6 sm:p-7" noValidate>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-flare-500/25 bg-flare-500/[0.08] text-flare-400">
          <ArrowDownToLine className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-chalk">Add sandbox funds</h2>
          <p className="mt-0.5 text-sm text-fog">
            Credits are instant and simulated — no payment is taken and nothing arrives on-chain.
          </p>
        </div>
      </div>

      {/* Asset picker */}
      <fieldset>
        <legend className="label">Asset</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {ASSETS.map((a) => {
            const m = assetMeta(a);
            const selected = a === asset;
            return (
              <label
                key={a}
                className={clsx(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition",
                  selected
                    ? "border-flare-500/60 bg-flare-500/10"
                    : "border-line bg-night-850/60 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="asset"
                  value={a}
                  checked={selected}
                  onChange={() => setAsset(a)}
                  className="sr-only"
                />
                <AssetIcon asset={a} size={34} />
                <span className={clsx("text-xs font-bold", selected ? "text-chalk" : "text-mist")}>
                  {a}
                </span>
                <span className="text-[10px] text-smoke">{m.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Amount */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <span className="mb-1.5 text-[11px] text-smoke tabular-nums">
            Min {limits.min} · Max {limits.max.toLocaleString("en-US")}
          </span>
        </div>
        <div className="relative">
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder={`0.00 ${asset}`}
            className={clsx("field pr-16 text-lg font-bold tabular-nums", !valid && amount && "field-error")}
          />
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-fog">
            {asset}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {QUICK[asset].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className={clsx("chip", String(parsed) === String(q) && "chip-active")}
            >
              +{q.toLocaleString("en-US")}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => setAmount("")}>
            Clear
          </button>
        </div>
        {amount && !valid ? (
          <p className="error-text">
            Enter an amount between {limits.min} and {limits.max.toLocaleString("en-US")} {asset}.
          </p>
        ) : null}
      </div>

      {/* Projection */}
      <div className="rounded-2xl border border-line bg-night-850/60 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-fog">Current balance</span>
          <span className="font-semibold text-mist tabular-nums">
            {fmtAmount(balances[asset] ?? 0, asset)} {asset}
          </span>
        </div>
        <div className="my-2.5 h-px bg-line" />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-fog">After this deposit</span>
          <span className="font-extrabold text-mint-400 tabular-nums">
            {fmtAmount(projected, asset)} {asset}
          </span>
        </div>
        <p className="mt-1 text-right text-[11px] text-smoke tabular-nums">
          ≈ {fmtUsd(projected * meta.price)}
        </p>
      </div>

      <FormFeedback state={state} />

      <SubmitButton variant="primary" size="lg" block pendingLabel="Crediting…" disabled={!valid}>
        <ArrowDownToLine className="h-4 w-4" />
        Credit {asset} to my sandbox balance
      </SubmitButton>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-smoke">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Every top-up writes a ledger entry with its own reference, visible under Transactions. This
        is a demonstration environment — no real {meta.name} is created, moved or held.
      </p>
    </form>
  );
}
