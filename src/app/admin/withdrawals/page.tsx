import type { Metadata } from "next";
import { FileClock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { UserSearchBar } from "@/components/admin/UserSearchBar";
import { WithdrawalReviewControls } from "@/components/admin/WithdrawalReviewControls";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { FilterLinks } from "@/components/ui/FilterLinks";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { WithdrawalStatusPill } from "@/components/ui/StatusPill";
import { requireAdmin } from "@/lib/auth";
import { fmtAmount, fmtDateTime, maskAddress, timeAgo } from "@/lib/format";
import { getRepo } from "@/lib/repo";
import type { WithdrawalStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Withdrawal queue" };

const STATUSES: { value: WithdrawalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const rawStatus = first(params.status);
  const status = STATUSES.some((s) => s.value === rawStatus)
    ? (rawStatus as WithdrawalStatus)
    : undefined;
  const q = first(params.q) ?? "";

  const repo = getRepo();
  const [filtered, all] = await Promise.all([
    repo.listWithdrawals({ status, q: q || undefined, limit: 100 }),
    repo.listWithdrawals({ limit: 500 }),
  ]);

  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  for (const w of all.rows) counts[w.status] = (counts[w.status] ?? 0) + 1;

  return (
    <AdminFrame
      profile={admin}
      title="Withdrawal queue"
      subtitle="Approve, reject or cancel member requests. Rejections and cancellations refund the held amount automatically."
      badge={
        <span className="badge border-gold-400/30 bg-gold-400/10 text-gold-300">
          <FileClock className="h-3.5 w-3.5" />
          {counts.pending} awaiting review
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        <Suspense fallback={<div className="skeleton h-12 w-full" />}>
          <UserSearchBar placeholder="Search by reference, wallet address or username…" />
        </Suspense>

        <FilterLinks
          basePath="/admin/withdrawals"
          param="status"
          options={STATUSES}
          current={status}
          counts={counts}
          extraParams={{ q }}
        />

        {filtered.rows.length === 0 ? (
          <EmptyState
            icon={<FileClock className="h-5 w-5" />}
            title={status ? `No ${status} requests` : "No withdrawal requests"}
            description={
              q
                ? `Nothing matches “${q}”. Try a reference such as TRW-…, a username, or part of a wallet address.`
                : "Requests submitted by members appear here for review."
            }
          />
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden overflow-hidden rounded-card border border-line xl:block">
              <table className="w-full border-collapse">
                <thead className="border-b border-line bg-night-900/70">
                  <tr>
                    <th className="th">Member</th>
                    <th className="th">Asset</th>
                    <th className="th text-right">Amount</th>
                    <th className="th text-right">Payout</th>
                    <th className="th">Destination</th>
                    <th className="th">Reference</th>
                    <th className="th">Requested</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.rows.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-line/60 align-top transition last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="td">
                        <Link
                          href={`/admin/users/${w.username}`}
                          className="text-sm font-bold text-flare-300 hover:text-flare-200"
                        >
                          @{w.username}
                        </Link>
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-2">
                          <AssetIcon asset={w.asset} size={26} />
                          <span className="flex flex-col">
                            <span className="text-xs font-bold text-chalk">{w.asset}</span>
                            <span className="text-[10px] text-smoke uppercase">{w.network}</span>
                          </span>
                        </span>
                      </td>
                      <td className="td text-right">
                        <span className="block text-sm font-bold text-chalk tabular-nums">
                          {fmtAmount(w.amount, w.asset)}
                        </span>
                        <span className="block text-[11px] text-smoke tabular-nums">
                          fee {fmtAmount(w.fee, w.asset)}
                        </span>
                      </td>
                      <td className="td text-right text-sm font-bold text-mint-400 tabular-nums">
                        {fmtAmount(w.payout, w.asset)}
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-2">
                          <code className="text-[11px] text-mist">
                            {maskAddress(w.wallet_address)}
                          </code>
                          <CopyButton value={w.wallet_address} compact label="address" />
                        </span>
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-2">
                          <code className="text-[11px] text-mist">{w.reference}</code>
                          <CopyButton value={w.reference} compact label="reference" />
                        </span>
                      </td>
                      <td className="td whitespace-nowrap">
                        <span className="block text-xs text-mist tabular-nums">
                          {fmtDateTime(w.created_at)}
                        </span>
                        <span className="block text-[11px] text-smoke">{timeAgo(w.created_at)}</span>
                      </td>
                      <td className="td">
                        <WithdrawalStatusPill status={w.status} />
                        {w.admin_note ? (
                          <span className="mt-1.5 block max-w-[14rem] text-[11px] leading-snug text-smoke">
                            {w.admin_note}
                          </span>
                        ) : null}
                      </td>
                      <td className="td text-right">
                        <WithdrawalReviewControls withdrawal={w} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile / tablet cards ── */}
            <ul className="flex flex-col gap-3 xl:hidden">
              {filtered.rows.map((w) => (
                <li key={w.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <AssetIcon asset={w.asset} size={38} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/users/${w.username}`}
                          className="block truncate text-sm font-bold text-flare-300 hover:text-flare-200"
                        >
                          @{w.username}
                        </Link>
                        <p className="text-sm font-bold text-chalk tabular-nums">
                          {fmtAmount(w.amount, w.asset)} {w.asset}
                        </p>
                        <p className="text-[11px] text-smoke uppercase">{w.network} network</p>
                      </div>
                    </div>
                    <WithdrawalStatusPill status={w.status} />
                  </div>

                  <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                    <div>
                      <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                        Payout
                      </dt>
                      <dd className="mt-0.5 font-bold text-mint-400 tabular-nums">
                        {fmtAmount(w.payout, w.asset)} {w.asset}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                        Requested
                      </dt>
                      <dd className="mt-0.5 font-semibold text-mist tabular-nums">
                        {timeAgo(w.created_at)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                        Destination
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-mist">
                          {w.wallet_address}
                        </code>
                        <CopyButton value={w.wallet_address} compact label="address" />
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                        Reference
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-2">
                        <code className="text-[11px] text-mist">{w.reference}</code>
                        <CopyButton value={w.reference} compact label="reference" />
                      </dd>
                    </div>
                  </dl>

                  {w.admin_note ? (
                    <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-mist">
                      <span className="font-bold text-fog">Note: </span>
                      {w.admin_note}
                    </p>
                  ) : null}

                  <div className="mt-3.5 border-t border-line pt-3.5">
                    <WithdrawalReviewControls withdrawal={w} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminFrame>
  );
}
