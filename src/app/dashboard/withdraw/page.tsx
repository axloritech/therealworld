import type { Metadata } from "next";
import Link from "next/link";
import { WithdrawForm } from "@/components/dashboard/WithdrawForm";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { requireUser } from "@/lib/auth";
import { isAsset } from "@/lib/config";
import { getRepo } from "@/lib/repo";
import type { Asset } from "@/lib/types";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser("/dashboard/withdraw");
  const params = await searchParams;
  const raw = Array.isArray(params.asset) ? params.asset[0] : params.asset;
  const defaultAsset: Asset | undefined = isAsset(raw) ? raw : undefined;

  const balances = await getRepo().getBalances(profile.id);

  return (
    <DashboardFrame
      profile={profile}
      title="Request a withdrawal"
      subtitle="Amount plus destination wallet address — created as Pending until an administrator reviews it."
      actions={
        <Link href="/dashboard/withdrawals" className="btn-ghost btn-sm">
          My requests
        </Link>
      }
    >
      <WithdrawForm balances={balances} defaultAsset={defaultAsset} />
    </DashboardFrame>
  );
}
