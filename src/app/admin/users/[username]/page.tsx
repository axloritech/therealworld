import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Mail, MessageSquareText, ScrollText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountControls } from "@/components/admin/AccountControls";
import { BalanceEditor } from "@/components/admin/BalanceEditor";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { Avatar } from "@/components/dashboard/AppShell";
import { BalanceGrid } from "@/components/dashboard/BalanceGrid";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { WithdrawalList } from "@/components/dashboard/WithdrawalList";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { RolePill, ThreadStatusPill } from "@/components/ui/StatusPill";
import { requireAdmin } from "@/lib/auth";
import { usdValue } from "@/lib/config";
import { fmtDateTime, fmtUsd, timeAgo } from "@/lib/format";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = { title: "Member profile" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const admin = await requireAdmin();
  const { username } = await params;

  const repo = getRepo();
  const target = await repo.findProfileByUsername(username);
  if (!target) notFound();

  const [balances, transactions, withdrawals, threads] = await Promise.all([
    repo.getBalances(target.id),
    repo.listTransactions(target.id, { limit: 25 }),
    repo.listWithdrawals({ userId: target.id, limit: 25 }),
    repo.listThreads({ userId: target.id, limit: 20 }),
  ]);

  return (
    <AdminFrame
      profile={admin}
      title={`@${target.username}`}
      subtitle={target.full_name ?? "No display name set"}
      badge={<RolePill role={target.role} />}
      actions={
        <>
          {threads.length > 0 ? (
            <Link href={`/admin/support/${threads[0].id}`} className="btn-primary btn-sm">
              <MessageSquareText className="h-3.5 w-3.5" />
              Open conversation
            </Link>
          ) : null}
          <Link href="/admin/users" className="btn-ghost btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            All members
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── Profile summary ── */}
        <section className="card-flare relative overflow-hidden p-6">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(80%_140%_at_92%_-10%,rgba(229,162,34,0.18),transparent_60%)]"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Avatar profile={target} size={56} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-chalk">@{target.username}</h2>
                  <RolePill role={target.role} />
                  {!target.is_active ? (
                    <span className="badge border-rose-500/35 bg-rose-500/10 text-rose-400">
                      Suspended
                    </span>
                  ) : (
                    <span className="badge border-mint-500/35 bg-mint-500/10 text-mint-400">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-mist">{target.full_name ?? "—"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fog">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {target.email}
                    <CopyButton value={target.email} compact label="email" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Joined {fmtDateTime(target.created_at)}
                  </span>
                  {target.last_seen_at ? (
                    <span>Last seen {timeAgo(target.last_seen_at)}</span>
                  ) : null}
                  {target.country ? <span>{target.country}</span> : null}
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-line bg-night-900/70 px-5 py-4 text-center">
              <p className="text-[10px] font-bold tracking-[0.16em] text-smoke uppercase">
                Portfolio value
              </p>
              <p className="mt-1 text-2xl font-extrabold text-chalk tabular-nums">
                {fmtUsd(usdValue(balances))}
              </p>
              <p className="mt-1 text-[11px] text-fog tabular-nums">
                {withdrawals.rows.filter((w) => w.status === "pending").length} pending request
                {withdrawals.rows.filter((w) => w.status === "pending").length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
          {/* ── Left: data ── */}
          <div className="flex flex-col gap-6">
            <BalanceGrid balances={balances} />

            <section className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <ScrollText className="h-4 w-4 text-flare-400" />
                Withdrawal requests
              </h2>
              <WithdrawalList
                withdrawals={withdrawals.rows}
                emptyTitle="No withdrawal requests"
                emptyDescription="This member has not submitted a withdrawal request yet."
              />
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <ScrollText className="h-4 w-4 text-flare-400" />
                Transaction history
                <span className="badge border-line bg-white/[0.04] text-fog">
                  {transactions.length} shown
                </span>
              </h2>
              <TransactionTable
                transactions={transactions}
                emptyTitle="No ledger entries"
                emptyDescription="Deposits, withdrawals and adjustments will appear here."
              />
            </section>
          </div>

          {/* ── Right: controls ── */}
          <div className="flex flex-col gap-6">
            <BalanceEditor
              userId={target.id}
              username={target.username}
              balances={balances}
              adminName={admin.username}
            />
            <AccountControls target={target} viewer={admin} />

            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <MessageSquareText className="h-4 w-4 text-flare-400" />
                Support history
              </h2>
              {threads.length === 0 ? (
                <p className="mt-3 text-sm text-fog">
                  This member has not contacted support yet.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {threads.map((thread) => (
                    <li key={thread.id}>
                      <Link
                        href={`/admin/support/${thread.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-night-850/60 px-3.5 py-2.5 transition hover:border-flare-500/35"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-chalk">
                            {thread.subject}
                          </span>
                          <span className="block text-[11px] text-smoke">
                            {thread.message_count} messages · {timeAgo(thread.last_message_at)}
                          </span>
                        </span>
                        <ThreadStatusPill status={thread.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <EmptyState
              className="py-8"
              title="Sandbox controls"
              description="Balance edits, role changes and withdrawals here affect demo data only. Every action is written to the member's ledger with your admin reference."
            />
          </div>
        </div>
      </div>
    </AdminFrame>
  );
}
