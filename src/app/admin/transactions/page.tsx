import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { FilterLinks } from "@/components/ui/FilterLinks";
import { requireAdmin } from "@/lib/auth";
import { ASSETS, isAsset } from "@/lib/config";
import { getRepo } from "@/lib/repo";
import type { Asset } from "@/lib/types";

export const metadata: Metadata = { title: "Global ledger" };

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const raw = Array.isArray(params.asset) ? params.asset[0] : params.asset;
  const asset: Asset | undefined = isAsset(raw) ? raw : undefined;

  const repo = getRepo();
  const transactions = await repo.listTransactions(null, { asset, limit: 200 });
  const profiles = await repo.findProfilesByIds(
    Array.from(new Set(transactions.map((t) => t.user_id))),
  );
  const usernames: Record<string, string> = {};
  for (const [id, profile] of Object.entries(profiles)) usernames[id] = profile.username;

  return (
    <AdminFrame
      profile={admin}
      title="Global ledger"
      subtitle="Every credit, debit, reversal and administrator adjustment across the platform, newest first."
      badge={
        <span className="badge border-line bg-white/[0.04] text-mist">
          <ScrollText className="h-3.5 w-3.5" />
          {transactions.length} entries
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        <FilterLinks
          basePath="/admin/transactions"
          param="asset"
          options={ASSETS.map((a) => ({ value: a, label: a }))}
          current={asset}
        />
        <TransactionTable
          transactions={transactions}
          usernames={usernames}
          emptyTitle="The ledger is empty"
          emptyDescription="Entries appear as soon as members deposit, withdraw or receive an adjustment."
        />
      </div>
    </AdminFrame>
  );
}
