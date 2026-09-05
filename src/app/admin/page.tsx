import type { Metadata } from "next";
import {
  ArrowRight,
  Clock,
  FileClock,
  MessageSquareText,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { TreasurySendForm } from "@/components/admin/TreasurySendForm";
import { WithdrawalReviewControls } from "@/components/admin/WithdrawalReviewControls";
import { Avatar } from "@/components/dashboard/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ThreadStatusPill } from "@/components/ui/StatusPill";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_MOCK_BALANCE_USD, ASSETS, assetMeta, usdValue } from "@/lib/config";
import { fmtAmount, fmtDateTime, fmtUsd, timeAgo } from "@/lib/format";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();
  const repo = getRepo();

  const [stats, pending, recentUsers, threads, ledger] = await Promise.all([
    repo.adminStats(),
    repo.listWithdrawals({ status: "pending", limit: 5 }),
    repo.listProfiles({ limit: 5 }),
    repo.listThreads({ limit: 5 }),
    repo.listTransactions(null, { limit: 6 }),
  ]);

  return (
    <AdminFrame
      profile={admin}
      title="Control centre"
      subtitle="Platform health, the withdrawal review queue and everything members are asking about."
      actions={
        <>
          <Link href="/admin/withdrawals" className="btn-gold btn-sm">
            <FileClock className="h-3.5 w-3.5" />
            Review queue
          </Link>
          <Link href="/admin/users" className="btn-ghost btn-sm">
            <Users className="h-3.5 w-3.5" />
            Find a member
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── Mock treasury balance (administrators only) ── */}
        <section className="panel-brand relative overflow-hidden rounded-card px-6 py-7 sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(70%_120%_at_85%_-10%,rgba(0,0,0,0.35),transparent_60%)]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-white/85 uppercase">
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                Admin balance · mock
              </p>
              <p className="mt-2.5 text-3xl font-extrabold text-white tabular-nums sm:text-5xl">
                {fmtUsd(ADMIN_MOCK_BALANCE_USD)}
              </p>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-white/80">
                One trillion dollars of demonstration credit, visible to administrators only.
                The figure is cosmetic: it exists in no ledger, backs no withdrawal, and the
                sandbox holds no real funds of any kind.
              </p>
            </div>
            <span className="badge border-white/30 bg-white/10 text-white">
              Sandbox credit · $1T
            </span>
          </div>
          <dl className="relative mt-6 grid gap-3 border-t border-white/20 pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-white/75 uppercase">
                Sent to members
              </dt>
              <dd className="mt-1 text-lg font-extrabold text-white tabular-nums">
                {fmtUsd(stats.treasury_sent_usd)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-white/75 uppercase">
                Remaining mock balance
              </dt>
              <dd className="mt-1 text-lg font-extrabold text-white tabular-nums">
                {fmtUsd(Math.max(0, ADMIN_MOCK_BALANCE_USD - stats.treasury_sent_usd))}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── Send mock funds to a member by username ── */}
        <section className="card p-5 sm:p-6">
          <header className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-chalk">Send from the mock treasury</h2>
            <span className="badge border-line bg-white/[0.04] text-fog">By username</span>
          </header>
          <p className="mt-2 text-xs leading-relaxed text-smoke">
            Credit any member&apos;s sandbox balance straight from the administrator&apos;s mock
            balance. Every send is written to the recipient&apos;s ledger as a treasury transfer,
            and the mock balance above decreases by its USD value.
          </p>
          <div className="mt-5">
            <TreasurySendForm
              remainingUsd={Math.max(0, ADMIN_MOCK_BALANCE_USD - stats.treasury_sent_usd)}
            />
          </div>
        </section>

        {/* ── Headline stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Members"
            value={String(stats.users)}
            hint={`${stats.transactions} ledger entries`}
            href="/admin/users"
          />
          <StatCard
            icon={<FileClock className="h-4 w-4" />}
            label="Pending withdrawals"
            value={String(stats.pending_withdrawals)}
            hint={`${stats.approved_withdrawals} approved · ${stats.rejected_withdrawals} rejected`}
            href="/admin/withdrawals?status=pending"
            tone={stats.pending_withdrawals > 0 ? "gold" : "default"}
          />
          <StatCard
            icon={<MessageSquareText className="h-4 w-4" />}
            label="Open conversations"
            value={String(stats.open_threads)}
            hint="Awaiting a reply"
            href="/admin/support"
            tone={stats.open_threads > 0 ? "flare" : "default"}
          />
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Value held"
            value={fmtUsd(usdValue(stats.balances), true)}
            hint="Across all sandbox balances"
            href="/admin/transactions"
          />
        </div>

        {/* ── Balances in custody (simulated) ── */}
        <section className="card p-5 sm:p-6">
          <header className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-chalk">Simulated balances in custody</h2>
            <span className="badge border-gold-400/30 bg-gold-400/10 text-gold-300">
              Demo funds
            </span>
          </header>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {ASSETS.map((asset) => {
              const amount = stats.balances[asset] ?? 0;
              const meta = assetMeta(asset);
              return (
                <div
                  key={asset}
                  className="rounded-2xl border border-line bg-night-850/60 p-4"
                  style={{ borderLeft: `2px solid ${meta.tint}66` }}
                >
                  <p className="text-[11px] font-bold tracking-[0.14em] text-fog uppercase">
                    {meta.name}
                  </p>
                  <p className="mt-1.5 text-xl font-extrabold text-chalk tabular-nums">
                    {fmtAmount(amount, asset)}
                    <span className="ml-1.5 text-xs font-bold text-fog">{asset}</span>
                  </p>
                  <p className="text-[11px] text-smoke tabular-nums">≈ {fmtUsd(amount * meta.price)}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-smoke">
            Approved payout volume to date:{" "}
            <span className="font-semibold text-mist">{fmtUsd(stats.withdrawal_volume)}</span> —
            recorded in the ledger only. No real cryptocurrency is transferred by this platform.
          </p>
        </section>

        {/* ── Review queue ── */}
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
              <Clock className="h-4 w-4 text-gold-400" />
              Withdrawal review queue
            </h2>
            <Link
              href="/admin/withdrawals"
              className="text-xs font-semibold text-flare-300 hover:text-flare-200"
            >
              Open full queue
            </Link>
          </header>
          <div className="p-5">
            {pending.rows.length === 0 ? (
              <EmptyState
                icon={<FileClock className="h-5 w-5" />}
                title="Queue is clear"
                description="No withdrawal requests are waiting for review right now."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {pending.rows.map((w) => (
                  <li
                    key={w.id}
                    className="flex flex-col gap-4 rounded-2xl border border-gold-400/20 bg-night-850/50 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          href={`/admin/users/${w.username}`}
                          className="text-sm font-bold text-flare-300 hover:text-flare-200"
                        >
                          @{w.username}
                        </Link>
                        <span className="text-sm font-bold text-chalk tabular-nums">
                          {fmtAmount(w.amount, w.asset)} {w.asset}
                        </span>
                        <span className="badge border-line bg-white/[0.04] text-fog">
                          {w.network.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-smoke">
                        {w.wallet_address}
                      </p>
                      <p className="mt-0.5 text-[11px] text-smoke tabular-nums">
                        {w.reference} · requested {timeAgo(w.created_at)} · payout{" "}
                        {fmtAmount(w.payout, w.asset)} {w.asset}
                      </p>
                    </div>
                    <WithdrawalReviewControls withdrawal={w} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Recent members ── */}
          <section className="card overflow-hidden">
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <Users className="h-4 w-4 text-flare-400" />
                Newest members
              </h2>
              <Link href="/admin/users" className="text-xs font-semibold text-flare-300 hover:text-flare-200">
                All members
              </Link>
            </header>
            <ul className="divide-y divide-line/60">
              {recentUsers.rows.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/admin/users/${user.username}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]"
                  >
                    <Avatar profile={user} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-chalk">
                        @{user.username}
                      </span>
                      <span className="block truncate text-[11px] text-smoke">
                        {user.full_name ?? "—"} · joined {fmtDateTime(user.created_at)}
                      </span>
                    </span>
                    <span
                      className={`badge shrink-0 ${
                        user.role === "admin"
                          ? "border-gold-400/30 bg-gold-400/10 text-gold-300"
                          : "border-line bg-white/[0.04] text-fog"
                      }`}
                    >
                      {user.role}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-smoke" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Support inbox ── */}
          <section className="card overflow-hidden">
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
                <MessageSquareText className="h-4 w-4 text-flare-400" />
                Latest conversations
              </h2>
              <Link href="/admin/support" className="text-xs font-semibold text-flare-300 hover:text-flare-200">
                Inbox
              </Link>
            </header>
            {threads.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<MessageSquareText className="h-5 w-5" />}
                  title="No conversations"
                  description="Member messages will appear here as soon as they are sent."
                />
              </div>
            ) : (
              <ul className="divide-y divide-line/60">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      href={`/admin/support/${thread.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-chalk">
                          {thread.subject}
                        </span>
                        <span className="block truncate text-[11px] text-smoke">
                          @{thread.username} · {thread.message_count} message
                          {thread.message_count === 1 ? "" : "s"} · {timeAgo(thread.last_message_at)}
                        </span>
                      </span>
                      <ThreadStatusPill status={thread.status} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Global ledger ── */}
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
              <ScrollText className="h-4 w-4 text-flare-400" />
              Latest ledger entries
            </h2>
            <Link href="/admin/transactions" className="text-xs font-semibold text-flare-300 hover:text-flare-200">
              Full ledger
            </Link>
          </header>
          <ul className="divide-y divide-line/60">
            {ledger.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-chalk">
                    {tx.type.replace(/_/g, " ")} · {fmtAmount(tx.amount, tx.asset)} {tx.asset}
                  </span>
                  <span className="block truncate text-[11px] text-smoke tabular-nums">
                    {fmtDateTime(tx.created_at)} · {tx.reference ?? "—"}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-xs font-bold tabular-nums ${
                    tx.direction === "credit" ? "text-mint-400" : "text-flare-300"
                  }`}
                >
                  {tx.direction === "credit" ? "+" : "−"}
                  {fmtAmount(tx.amount, tx.asset)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminFrame>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  href: string;
  tone?: "default" | "gold" | "flare";
}) {
  const toneClass =
    tone === "gold"
      ? "border-gold-400/35 text-gold-300"
      : tone === "flare"
        ? "border-flare-500/35 text-flare-300"
        : "border-line text-flare-400";
  return (
    <Link href={href} className="card card-hover flex items-start gap-4 p-5">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white/[0.03] ${toneClass}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold tracking-[0.16em] text-fog uppercase">
          {label}
        </span>
        <span className="mt-1 block text-2xl font-extrabold text-chalk tabular-nums">{value}</span>
        <span className="mt-0.5 block truncate text-[11px] text-smoke">{hint}</span>
      </span>
    </Link>
  );
}
