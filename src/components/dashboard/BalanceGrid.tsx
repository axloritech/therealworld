import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { ASSETS, assetMeta, usdValue } from "@/lib/config";
import { fmtAmount, fmtUsd } from "@/lib/format";
import type { Asset, Balances } from "@/lib/types";

/** Headline portfolio tile: indicative USD total plus the per-asset split. */
export function PortfolioCard({
  balances,
  pendingCount = 0,
  pendingValue = 0,
}: {
  balances: Balances;
  pendingCount?: number;
  pendingValue?: number;
}) {
  const total = usdValue(balances);

  return (
    <section className="card-flare relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(90%_140%_at_88%_-10%,rgba(255,122,24,0.22),transparent_60%)]"
      />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge border-gold-400/30 bg-gold-400/10 text-gold-300">
              Sandbox portfolio
            </span>
            {pendingCount > 0 ? (
              <span className="badge border-line bg-white/[0.04] text-mist">
                {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-fog uppercase">
            Indicative total value
          </p>
          <p className="text-4xl font-extrabold text-chalk tabular-nums sm:text-5xl">
            {fmtUsd(total)}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-fog">
            Converted at fixed demo reference prices. Held funds awaiting review:{" "}
            <span className="font-semibold text-gold-300 tabular-nums">{fmtUsd(pendingValue)}</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link href="/dashboard/deposit" className="btn-primary">
            <ArrowDownToLine className="h-4 w-4" />
            Deposit demo funds
          </Link>
          <Link href="/dashboard/withdraw" className="btn-ghost">
            <ArrowUpRight className="h-4 w-4 text-flare-400" />
            Request withdrawal
          </Link>
        </div>
      </div>

      {/* Split bar */}
      <div className="relative mt-8">
        <div className="flex h-2 overflow-hidden rounded-pill bg-night-800">
          {total > 0
            ? ASSETS.map((asset) => {
                const share = ((balances[asset] ?? 0) * assetMeta(asset).price) / total;
                if (share <= 0) return null;
                return (
                  <span
                    key={asset}
                    className="h-full"
                    style={{ width: `${share * 100}%`, background: assetMeta(asset).tint }}
                    title={`${asset} ${Math.round(share * 100)}%`}
                  />
                );
              })
            : <span className="h-full w-full bg-night-700" />}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {ASSETS.map((asset) => {
            const value = (balances[asset] ?? 0) * assetMeta(asset).price;
            const share = total > 0 ? (value / total) * 100 : 0;
            return (
              <span key={asset} className="flex items-center gap-2 text-xs text-fog">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: assetMeta(asset).tint }}
                />
                <span className="font-bold text-mist">{asset}</span>
                <span className="tabular-nums">{share.toFixed(1)}%</span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** The three balance tiles. */
export function BalanceGrid({ balances }: { balances: Balances }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ASSETS.map((asset) => (
        <BalanceCard key={asset} asset={asset} amount={balances[asset] ?? 0} />
      ))}
    </div>
  );
}

export function BalanceCard({
  asset,
  amount,
  actions = true,
}: {
  asset: Asset;
  amount: number;
  actions?: boolean;
}) {
  const meta = assetMeta(asset);
  const value = amount * meta.price;

  return (
    <article className="card card-hover relative flex flex-col gap-4 overflow-hidden p-5">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.tint}88, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AssetIcon asset={asset} size={42} />
          <div>
            <h3 className="text-sm font-bold text-chalk">{meta.symbol}</h3>
            <p className="text-[11px] text-fog">{meta.name}</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-smoke tabular-nums">
          {fmtUsd(meta.price)}/{meta.symbol}
        </span>
      </div>

      <div>
        <p className="text-2xl font-extrabold text-chalk tabular-nums">
          {fmtAmount(amount, asset)}
          <span className="ml-1.5 text-sm font-bold text-fog">{asset}</span>
        </p>
        <p className="mt-0.5 text-xs text-fog tabular-nums">≈ {fmtUsd(value)}</p>
      </div>

      {actions ? (
        <div className="mt-auto flex gap-2 border-t border-line pt-4">
          <Link
            href={`/dashboard/deposit?asset=${asset}`}
            className="btn-ghost btn-sm flex-1"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Deposit
          </Link>
          <Link href={`/dashboard/withdraw?asset=${asset}`} className="btn-outline btn-sm flex-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Withdraw
          </Link>
        </div>
      ) : null}
    </article>
  );
}
