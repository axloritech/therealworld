import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  FileClock,
  MessageSquareText,
  ScrollText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  BalanceGrid,
  PortfolioCard,
} from "@/components/dashboard/BalanceGrid";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { EmptyState } from "@/components/ui/EmptyState";
import { ThreadStatusPill, WithdrawalStatusPill } from "@/components/ui/StatusPill";
import { requireUser } from "@/lib/auth";
import { STARTER_BALANCES } from "@/lib/config";
import { fmtAmount, fmtDateTime, fmtUsd, timeAgo } from "@/lib/format";
import { getRepo } from "@/lib/repo";
import { assetMeta } from "@/lib/config";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const welcome = Array.isArray(params.welcome) ? params.welcome[0] : params.welcome;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  const profile = await requireUser("/dashboard");
  const repo = getRepo();

  const [balances, transactions, withdrawals, threads] = await Promise.all([
    repo.getBalances(profile.id),
    repo.listTransactions(profile.id, { limit: 6 }),
    repo.listWithdrawals({ userId: profile.id, limit: 4 }),
    repo.listThreads({ userId: profile.id, limit: 3 }),
  ]);

  const pending = withdrawals.rows.filter((w) => w.status === "pending");
  const pendingValue = pending.reduce((sum, w) => sum + w.amount * assetMeta(w.asset).price, 0);
  const openThreads = threads.filter((t) => t.status !== "closed");

  return (
    <DashboardFrame
      profile={profile}
      title={greeting(profile.full_name || profile.username)}
      subtitle="Your sandbox balances, requests and support history in one place."
      actions={
        <>
          <Link href="/dashboard/withdraw" className="btn-primary btn-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            New withdrawal
          </Link>
          <Link href="/dashboard/support" className="btn-ghost btn-sm">
            <MessageSquareText className="h-3.5 w-3.5" />
            Support
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {welcome ? (
          <div className="flex flex-col gap-3 rounded-card-lg border border-mint-500/30 bg-mint-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-mint-400" />
              <div>
                <p className="text-sm font-bold text-chalk">Welcome to your sandbox account</p>
                <p className="mt-1 text-sm text-mist">
                  We credited you with{" "}
                  <span className="font-semibold text-chalk">
                    {STARTER_BALANCES.BTC} BTC, {STARTER_BALANCES.ETH} ETH and{" "}
                    {STARTER_BALANCES.USDT.toLocaleString("en-US")} USDT
                  </span>{" "}
                  of demo funds. Try a withdrawal request — it will sit as Pending until an
                  administrator reviews it.
                </p>
              </div>
            </div>
            <Link href="/dashboard/withdraw" className="btn-primary btn-sm shrink-0">
              Try it now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        {error === "forbidden" ? (
          <div className="rounded-card border border-rose-500/35 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-400">
            That area needs administrator access. Your account role is{" "}
            <span className="font-bold">{profile.role}</span>.
          </div>
        ) : null}

        <PortfolioCard
          balances={balances}
          pendingCount={pending.length}
          pendingValue={pendingValue}
        />

        <BalanceGrid balances={balances} />

        {/* Pending queue */}
        {pending.length > 0 ? (
          <section className="card border-gold-400/25 bg-gold-400/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-300">
                  <FileClock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-chalk">
                    {pending.length} withdrawal request{pending.length === 1 ? "" : "s"} pending
                    review
                  </h2>
                  <p className="text-xs text-fog">
                    {fmtUsd(pendingValue)} held · nothing is released until an administrator acts
                  </p>
                </div>
              </div>
              <Link href="/dashboard/withdrawals" className="btn-ghost btn-sm">
                Review requests
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {pending.slice(0, 3).map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-night-900/60 px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-xs">
                    <code className="font-semibold text-mist">{w.reference}</code>
                    <span className="text-fog tabular-nums">
                      {fmtAmount(w.amount, w.asset)} {w.asset}
                    </span>
                    <span className="hidden text-smoke sm:inline">· {w.network.toUpperCase()}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[11px] text-smoke">{timeAgo(w.created_at)}</span>
                    <WithdrawalStatusPill status={w.status} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          {/* Recent ledger */}
          <section className="card overflow-hidden">
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <ScrollText className="h-4 w-4 text-flare-400" />
                Recent transactions
              </h2>
              <Link
                href="/dashboard/transactions"
                className="text-xs font-semibold text-flare-300 hover:text-flare-200"
              >
                View all
              </Link>
            </header>
            <div className="p-5">
              {transactions.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Deposit demo funds or request a withdrawal — every movement lands here with a reference."
                  action={
                    <Link href="/dashboard/deposit" className="btn-primary btn-sm">
                      Add demo funds
                    </Link>
                  }
                />
              ) : (
                <ul className="flex flex-col">
                  {transactions.map((tx) => {
                    const credit = tx.direction === "credit";
                    return (
                      <li
                        key={tx.id}
                        className="flex items-center justify-between gap-4 border-b border-line/60 py-3 last:border-0"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold text-chalk">
                            {labelFor(tx.type)}
                          </span>
                          <span className="truncate text-[11px] text-smoke tabular-nums">
                            {fmtDateTime(tx.created_at)} · {tx.reference ?? "—"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span
                            className={`block text-sm font-bold tabular-nums ${credit ? "text-mint-400" : "text-flare-300"}`}
                          >
                            {credit ? "+" : "−"}
                            {fmtAmount(tx.amount, tx.asset)} {tx.asset}
                          </span>
                          <span className="block text-[11px] text-smoke tabular-nums">
                            {tx.balance_after === null
                              ? ""
                              : `bal ${fmtAmount(tx.balance_after, tx.asset)}`}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Right rail */}
          <div className="flex flex-col gap-5">
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <MessageSquareText className="h-4 w-4 text-flare-400" />
                Support
              </h2>
              {threads.length === 0 ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-fog">
                    No conversations yet. Message an administrator and they will reply in the same
                    thread.
                  </p>
                  <Link href="/dashboard/support" className="btn-outline btn-sm btn-block mt-4">
                    Start a conversation
                  </Link>
                </>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {threads.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/support/${t.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-night-850/60 px-3.5 py-2.5 transition hover:border-flare-500/35"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-chalk">
                            {t.subject}
                          </span>
                          <span className="block text-[11px] text-smoke">
                            {timeAgo(t.last_message_at)}
                          </span>
                        </span>
                        <ThreadStatusPill status={t.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-smoke">
                {openThreads.length} open · answers are also in the{" "}
                <Link href="/faq" className="font-semibold text-flare-400/80 hover:text-flare-300">
                  FAQ
                </Link>
              </p>
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-bold text-chalk">Quick actions</h2>
              <div className="mt-3 grid gap-2">
                <QuickLink href="/dashboard/deposit" label="Add demo funds" hint="Instant sandbox credit" />
                <QuickLink href="/dashboard/withdraw" label="Request withdrawal" hint="Amount + wallet address" />
                <QuickLink href="/dashboard/withdrawals" label="Track requests" hint="Cancel while pending" />
                <QuickLink href="/dashboard/transactions" label="Full history" hint="Every ledger entry" />
                <QuickLink href="/dashboard/settings" label="Account settings" hint="Profile and password" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardFrame>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-night-850/50 px-3.5 py-2.5 transition hover:border-flare-500/35 hover:bg-night-850"
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-chalk">{label}</span>
        <span className="block truncate text-[11px] text-smoke">{hint}</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fog transition group-hover:translate-x-0.5 group-hover:text-flare-400" />
    </Link>
  );
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0] ?? name;
  return `${part}, ${first}`;
}

function labelFor(type: string): string {
  const map: Record<string, string> = {
    deposit: "Demo deposit",
    bonus: "Sandbox bonus",
    withdrawal: "Withdrawal request",
    withdrawal_reversal: "Withdrawal refund",
    admin_adjust: "Administrator adjustment",
    treasury: "Treasury transfer from admin",
    trade: "Trade",
  };
  return map[type] ?? "Ledger entry";
}
