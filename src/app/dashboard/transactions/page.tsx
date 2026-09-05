import type { Metadata } from "next";
import { Download } from "lucide-react";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { FilterLinks } from "@/components/ui/FilterLinks";
import { requireUser } from "@/lib/auth";
import { ASSETS, isAsset } from "@/lib/config";
import { getRepo } from "@/lib/repo";
import type { Asset } from "@/lib/types";

export const metadata: Metadata = { title: "Transaction history" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser("/dashboard/transactions");
  const params = await searchParams;
  const raw = Array.isArray(params.asset) ? params.asset[0] : params.asset;
  const asset: Asset | undefined = isAsset(raw) ? raw : undefined;

  const repo = getRepo();
  const all = await repo.listTransactions(profile.id, { limit: 500 });
  const rows = asset ? all.filter((t) => t.asset === asset) : all;

  const counts: Record<string, number> = { BTC: 0, ETH: 0, USDT: 0 };
  for (const t of all) counts[t.asset] = (counts[t.asset] ?? 0) + 1;

  const credits = rows.filter((t) => t.direction === "credit").length;
  const debits = rows.filter((t) => t.direction === "debit").length;

  return (
    <DashboardFrame
      profile={profile}
      title="Transaction history"
      subtitle="A complete, immutable record of every credit, debit, reversal and administrator adjustment on your account."
      actions={
        <span className="badge border-line bg-white/[0.04] text-mist">
          <Download className="h-3.5 w-3.5" />
          {rows.length} entr{rows.length === 1 ? "y" : "ies"}
        </span>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat label="Credits" value={String(credits)} tone="mint" />
          <MiniStat label="Debits" value={String(debits)} tone="flare" />
          <MiniStat label="Reversed" value={String(rows.filter((t) => t.status === "reversed").length)} tone="neutral" />
        </div>

        <FilterLinks
          basePath="/dashboard/transactions"
          param="asset"
          options={ASSETS.map((a) => ({ value: a, label: a }))}
          current={asset}
          counts={counts}
        />

        <TransactionTable transactions={rows} />
      </div>
    </DashboardFrame>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "mint" | "flare" | "neutral" }) {
  const colour =
    tone === "mint" ? "text-mint-400" : tone === "flare" ? "text-flare-300" : "text-mist";
  return (
    <div className="card flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-[11px] font-bold tracking-[0.16em] text-fog uppercase">{label}</span>
      <span className={`text-2xl font-extrabold tabular-nums ${colour}`}>{value}</span>
    </div>
  );
}
