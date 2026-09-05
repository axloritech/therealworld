import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { WithdrawalList } from "@/components/dashboard/WithdrawalList";
import { FilterLinks } from "@/components/ui/FilterLinks";
import { requireUser } from "@/lib/auth";
import { fmtUsd } from "@/lib/format";
import { getRepo } from "@/lib/repo";
import type { WithdrawalStatus } from "@/lib/types";
import { assetMeta } from "@/lib/config";

export const metadata: Metadata = { title: "Withdrawal requests" };

const STATUSES: { value: WithdrawalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser("/dashboard/withdrawals");
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = STATUSES.some((s) => s.value === raw) ? (raw as WithdrawalStatus) : undefined;

  const repo = getRepo();
  const [filtered, all] = await Promise.all([
    repo.listWithdrawals({ userId: profile.id, status, limit: 100 }),
    repo.listWithdrawals({ userId: profile.id, limit: 200 }),
  ]);

  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  for (const w of all.rows) counts[w.status] = (counts[w.status] ?? 0) + 1;

  const pendingValue = all.rows
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + w.amount * assetMeta(w.asset).price, 0);
  const approvedValue = all.rows
    .filter((w) => w.status === "approved")
    .reduce((sum, w) => sum + w.payout * assetMeta(w.asset).price, 0);

  return (
    <DashboardFrame
      profile={profile}
      title="Withdrawal requests"
      subtitle="Every request you have submitted, with its review state, reference and administrator note."
      actions={
        <Link href="/dashboard/withdraw" className="btn-primary btn-sm">
          <ArrowUpRight className="h-3.5 w-3.5" />
          New request
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Pending review" value={fmtUsd(pendingValue)} count={counts.pending} tone="gold" />
          <SummaryCard label="Approved" value={fmtUsd(approvedValue)} count={counts.approved} tone="mint" />
          <SummaryCard
            label="Rejected or cancelled"
            value="Refunded to balance"
            count={counts.rejected + counts.cancelled}
            tone="neutral"
          />
        </div>

        <FilterLinks
          basePath="/dashboard/withdrawals"
          param="status"
          options={STATUSES}
          current={status}
          counts={counts}
        />

        <WithdrawalList withdrawals={filtered.rows} cancelForUserId={profile.id} />
      </div>
    </DashboardFrame>
  );
}

function SummaryCard({
  label,
  value,
  count,
  tone,
}: {
  label: string;
  value: string;
  count: number;
  tone: "gold" | "mint" | "neutral";
}) {
  const toneClass =
    tone === "gold"
      ? "border-gold-400/25 text-gold-300"
      : tone === "mint"
        ? "border-mint-500/25 text-mint-400"
        : "border-line text-mist";
  return (
    <div className={`card p-5 ${toneClass}`}>
      <p className="text-[11px] font-bold tracking-[0.16em] text-fog uppercase">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-smoke">
        {count} request{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}
