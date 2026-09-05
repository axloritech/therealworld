"use client";

import { clsx } from "clsx";
import { ArrowUpRight, FileClock, Info, ShieldAlert, Wallet } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { withdrawAction } from "@/lib/actions/funds";
import { idleForm, type FormState } from "@/lib/actions/types";
import { ASSETS, assetMeta } from "@/lib/config";
import { fmtAmount, fmtUsd } from "@/lib/format";
import type { Asset, Balances } from "@/lib/types";
import { networksFor, parseAmount, validateAddress, validateAmount } from "@/lib/validate";

const ADDRESS_HINT: Record<string, string> = {
  bitcoin: "Legacy (1…), nested SegWit (3…) or native SegWit (bc1…)",
  erc20: "0x followed by 40 hex characters",
  arbitrum: "0x followed by 40 hex characters",
  bep20: "0x followed by 40 hex characters",
  trc20: "T followed by 33 base58 characters",
};

/**
 * Withdrawal request form: amount + destination wallet address.
 * Requests are created as Pending and stay there until an administrator
 * approves or rejects them, or the user cancels.
 */
export function WithdrawForm({
  balances,
  defaultAsset,
}: {
  balances: Balances;
  defaultAsset?: Asset;
}) {
  const [state, action] = useActionState<FormState, FormData>(withdrawAction, idleForm);
  const [asset, setAsset] = useState<Asset>(
    defaultAsset && ASSETS.includes(defaultAsset) ? defaultAsset : "BTC",
  );
  const [network, setNetwork] = useState<string>(
    networksFor(defaultAsset && ASSETS.includes(defaultAsset) ? defaultAsset : "BTC")[0]?.id ?? "bitcoin",
  );
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState<{ amount?: boolean; address?: boolean }>({});

  useEffect(() => {
    if (defaultAsset && ASSETS.includes(defaultAsset)) {
      setAsset(defaultAsset);
      setNetwork(networksFor(defaultAsset)[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAsset]);

  const meta = assetMeta(asset);
  const networks = networksFor(asset);
  const available = balances[asset] ?? 0;

  // Keep the network valid when the asset changes.
  useEffect(() => {
    if (!networks.some((n) => n.id === network)) setNetwork(networks[0]?.id ?? "");
  }, [asset, networks, network]);

  const amountCheck = useMemo(
    () => validateAmount(amount, asset, available),
    [amount, asset, available],
  );
  const addressError = useMemo(
    () => validateAddress(asset, network, address),
    [asset, network, address],
  );
  const amountError = amount ? amountCheck.error : null;
  const showAddressError = touched.address && addressError;
  const canSubmit = !amountCheck.error && amount !== "" && !addressError;

  function changeAsset(next: Asset) {
    setAsset(next);
    setNetwork(networksFor(next)[0]?.id ?? "");
    setAmount("");
    setTouched({});
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
      <form action={action} className="card-lg flex flex-col gap-6 p-6 sm:p-7" noValidate>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-flare-500/25 bg-flare-500/[0.08] text-flare-400">
            <ArrowUpRight className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-chalk">Request a withdrawal</h2>
            <p className="mt-0.5 text-sm text-fog">
              Enter an amount and a destination wallet address. The request is created as{" "}
              <span className="font-semibold text-gold-300">Pending</span>.
            </p>
          </div>
        </div>

        {/* Asset */}
        <fieldset>
          <legend className="label">Asset</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {ASSETS.map((a) => {
              const m = assetMeta(a);
              const selected = a === asset;
              const zero = (balances[a] ?? 0) <= 0;
              return (
                <label
                  key={a}
                  className={clsx(
                    "relative flex cursor-pointer flex-col items-start gap-2 rounded-2xl border px-3.5 py-3.5 transition",
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
                    onChange={() => changeAsset(a)}
                    className="sr-only"
                  />
                  <span className="flex w-full items-center gap-2">
                    <AssetIcon asset={a} size={30} />
                    <span className={clsx("text-sm font-bold", selected ? "text-chalk" : "text-mist")}>
                      {a}
                    </span>
                  </span>
                  <span className="text-[11px] text-fog tabular-nums">
                    {fmtAmount(balances[a] ?? 0, a)}
                  </span>
                  <span className="text-[10px] text-smoke">{m.name}</span>
                  {zero ? (
                    <span className="absolute top-2.5 right-2.5 rounded-pill bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-smoke uppercase">
                      Empty
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Network */}
        <div>
          <label htmlFor="network" className="label">
            Network
          </label>
          <select
            id="network"
            name="network"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="field cursor-pointer appearance-none pr-10"
          >
            {networks.map((n) => (
              <option key={n.id} value={n.id} className="bg-night-850">
                {n.label} · {n.confirmations} confirmations
              </option>
            ))}
          </select>
          <p className="hint">
            Send only {meta.symbol} on the network you select. A mismatched network is the most common
            cause of rejected requests.
          </p>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="amount" className="label">
              Amount
            </label>
            <span className="mb-1.5 text-[11px] text-smoke tabular-nums">
              Available{" "}
              <span className="font-bold text-mist">{fmtAmount(available, asset)} {asset}</span>
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
              onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
              placeholder={`0.00 ${asset}`}
              className={clsx(
                "field pr-20 text-lg font-bold tabular-nums",
                touched.amount && amountError && "field-error",
              )}
              aria-invalid={Boolean(touched.amount && amountError)}
            />
            <button
              type="button"
              onClick={() => setAmount(String(available))}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg border border-flare-500/40 bg-flare-500/10 px-2.5 py-1 text-[11px] font-bold text-flare-300 transition hover:bg-flare-500/20"
            >
              MAX
            </button>
          </div>
          <p className="hint">
            Limits {meta.minWithdraw}–{meta.maxWithdraw.toLocaleString("en-US")} {asset} per request ·
            demo fee {meta.fee} {asset}
          </p>
          {touched.amount && amountError ? <p className="error-text">{amountError}</p> : null}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="wallet_address" className="label">
            Destination wallet address
          </label>
          <div className="relative">
            <Wallet className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="wallet_address"
              name="wallet_address"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={address}
              onChange={(e) => setAddress(e.target.value.replace(/\s+/g, ""))}
              onBlur={() => setTouched((t) => ({ ...t, address: true }))}
              placeholder={network === "bitcoin" ? "bc1q…" : network === "trc20" ? "T…" : "0x…"}
              className={clsx("field font-mono pl-10", showAddressError && "field-error")}
              aria-invalid={Boolean(showAddressError)}
              aria-describedby="address-hint"
            />
          </div>
          <p id="address-hint" className="hint">
            Format for {network.toUpperCase()}: {ADDRESS_HINT[network] ?? "check the network"}
          </p>
          {showAddressError ? <p className="error-text">{addressError}</p> : null}
        </div>

        <FormFeedback state={state} />

        <SubmitButton
          variant="primary"
          size="lg"
          block
          pendingLabel="Submitting request…"
          disabled={!canSubmit}
        >
          <ArrowUpRight className="h-4 w-4" />
          Submit withdrawal request
        </SubmitButton>

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-smoke">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400" />
          Sandbox notice: addresses are validated for format only and are never broadcast to any
          blockchain. Approving a request records it in the ledger — no real funds move.
        </p>
      </form>

      {/* ── Summary rail ── */}
      <aside className="flex flex-col gap-4">
        <div className="card p-5">
          <h3 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">Request summary</h3>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <SummaryRow label="Asset" value={`${meta.symbol} · ${meta.name}`} />
            <SummaryRow label="Network" value={networks.find((n) => n.id === network)?.label ?? network} />
            <SummaryRow
              label="Amount"
              value={amountCheck.amount > 0 ? `${fmtAmount(amountCheck.amount, asset)} ${asset}` : "—"}
            />
            <SummaryRow
              label="Demo fee"
              value={amountCheck.amount > 0 ? `− ${fmtAmount(amountCheck.fee, asset)} ${asset}` : "—"}
            />
            <div className="my-1 h-px bg-line" />
            <SummaryRow
              label="You would receive"
              value={
                amountCheck.payout > 0
                  ? `${fmtAmount(amountCheck.payout, asset)} ${asset}`
                  : "—"
              }
              accent
            />
            <SummaryRow
              label="Indicative value"
              value={fmtUsd(amountCheck.payout * meta.price)}
            />
            <SummaryRow
              label="Balance after hold"
              value={`${fmtAmount(Math.max(0, available - (amountCheck.error ? 0 : amountCheck.amount)), asset)} ${asset}`}
            />
          </dl>
        </div>

        <div className="card border-gold-400/25 bg-gold-400/[0.04] p-5">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-gold-300 uppercase">
            <FileClock className="h-3.5 w-3.5" />
            What happens next
          </h3>
          <ol className="mt-3 flex flex-col gap-2.5 text-xs leading-relaxed text-mist">
            <Step n={1} text="Your request is created with status Pending and the amount is held." />
            <Step n={2} text="An administrator reviews it from the admin console." />
            <Step n={3} text="Approved requests are recorded as released. Rejected or cancelled requests refund the full amount instantly." />
            <Step n={4} text="You can cancel any pending request yourself from Withdrawals." />
          </ol>
        </div>

        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-fog uppercase">
            <Info className="h-3.5 w-3.5" />
            {meta.symbol} reference
          </h3>
          <dl className="mt-3 flex flex-col gap-2 text-xs">
            <SummaryRow label="Demo price" value={fmtUsd(meta.price)} />
            <SummaryRow label="Minimum" value={`${meta.minWithdraw} ${asset}`} />
            <SummaryRow label="Maximum" value={`${meta.maxWithdraw.toLocaleString("en-US")} ${asset}`} />
            <SummaryRow label="Fee" value={`${meta.fee} ${asset}`} />
            <SummaryRow label="Decimals" value={String(meta.decimals)} />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-fog">{label}</dt>
      <dd
        className={clsx(
          "text-right text-xs font-semibold tabular-nums",
          accent ? "text-base font-extrabold text-mint-400" : "text-mist",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border border-gold-400/40 text-[10px] font-bold text-gold-300">
        {n}
      </span>
      <span>{text}</span>
    </li>
  );
}
