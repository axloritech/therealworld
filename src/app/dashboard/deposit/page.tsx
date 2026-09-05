import type { Metadata } from "next";
import { ArrowDownToLine, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { DepositForm } from "@/components/dashboard/DepositForm";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { requireUser } from "@/lib/auth";
import { ASSETS, assetMeta, isAsset } from "@/lib/config";
import { fmtUsd } from "@/lib/format";
import { getRepo } from "@/lib/repo";
import type { Asset } from "@/lib/types";

export const metadata: Metadata = { title: "Deposit" };

export default async function DepositPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser("/dashboard/deposit");
  const params = await searchParams;
  const raw = Array.isArray(params.asset) ? params.asset[0] : params.asset;
  const defaultAsset: Asset | undefined = isAsset(raw) ? raw : undefined;

  const balances = await getRepo().getBalances(profile.id);

  return (
    <DashboardFrame
      profile={profile}
      title="Deposit demo funds"
      subtitle="Top up any sandbox balance instantly so you can exercise the full withdrawal flow."
      actions={
        <Link href="/dashboard/transactions" className="btn-ghost btn-sm">
          View ledger
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        <DepositForm balances={balances} defaultAsset={defaultAsset} />

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">
              Sandbox limits
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {ASSETS.map((asset) => {
                const meta = assetMeta(asset);
                return (
                  <li key={asset} className="rounded-xl border border-line bg-night-850/50 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-chalk">{asset}</span>
                      <span className="text-[11px] text-smoke tabular-nums">{fmtUsd(meta.price)}</span>
                    </div>
                    <dl className="mt-2 flex flex-col gap-1 text-[11px] text-fog">
                      <div className="flex justify-between gap-3">
                        <dt>Deposit range</dt>
                        <dd className="font-semibold text-mist tabular-nums">
                          {asset === "BTC" ? "0.0001 – 10" : asset === "ETH" ? "0.001 – 500" : "1 – 1,000,000"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Withdrawal range</dt>
                        <dd className="font-semibold text-mist tabular-nums">
                          {meta.minWithdraw} – {meta.maxWithdraw.toLocaleString("en-US")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Networks</dt>
                        <dd className="text-right font-semibold text-mist">
                          {meta.networks.map((n) => n.id.toUpperCase()).join(" · ")}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card border-gold-400/25 bg-gold-400/[0.04] p-5">
            <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-gold-300 uppercase">
              <TriangleAlert className="h-3.5 w-3.5" />
              Demonstration only
            </h2>
            <p className="mt-2.5 text-xs leading-relaxed text-mist">
              Deposits here are simulated credits. No payment card, bank transfer or blockchain
              transaction is involved, and no real {ASSETS.join(", ")} is created or held. The ledger
              entry exists so the review workflow can be demonstrated end to end.
            </p>
            <Link href="/faq#faq-5" className="btn-outline btn-sm btn-block mt-4">
              <Info className="h-3.5 w-3.5" />
              Read the deposit FAQ
            </Link>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">Next step</h2>
            <p className="mt-2 text-xs leading-relaxed text-fog">
              Once your balance is topped up, submit a withdrawal request with an amount and a wallet
              address. It is created as Pending and waits for administrator review.
            </p>
            <Link href="/dashboard/withdraw" className="btn-primary btn-sm btn-block mt-4">
              <ArrowDownToLine className="h-3.5 w-3.5 rotate-180" />
              Go to withdrawals
            </Link>
          </div>
        </aside>
      </div>
    </DashboardFrame>
  );
}
