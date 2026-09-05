import { ScrollText } from "lucide-react";
import { clsx } from "clsx";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { TransactionStatusPill } from "@/components/ui/StatusPill";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { TX_TYPE_META, directionLabel, fmtAmount, fmtDateTime } from "@/lib/format";
import type { Transaction } from "@/lib/types";

/**
 * Full ledger view. Renders as a table from md up and as stacked cards below
 * that, so the same data works on a phone and on a wide desktop.
 */
export function TransactionTable({
  transactions,
  usernames,
  emptyTitle = "No transactions yet",
  emptyDescription = "Deposits, withdrawals, refunds and administrator adjustments all appear here with a reference and a timestamp.",
}: {
  transactions: Transaction[];
  usernames?: Record<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden overflow-hidden rounded-card border border-line md:block">
        <table className="w-full border-collapse">
          <thead className="border-b border-line bg-night-900/70">
            <tr>
              <th className="th">Date</th>
              <th className="th">Type</th>
              <th className="th">Asset</th>
              <th className="th text-right">Amount</th>
              <th className="th text-right">Balance after</th>
              <th className="th">Reference</th>
              <th className="th text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const meta = TX_TYPE_META[tx.type];
              const credit = tx.direction === "credit";
              return (
                <tr
                  key={tx.id}
                  className="border-b border-line/60 transition last:border-0 hover:bg-white/[0.02]"
                >
                  <td className={clsx("td whitespace-nowrap", usernames && "pt-3")}>
                    <span className="block text-xs font-semibold text-mist tabular-nums">
                      {fmtDateTime(tx.created_at)}
                    </span>
                    {usernames?.[tx.user_id] ? (
                      <span className="block text-[11px] text-flare-400/80">
                        @{usernames[tx.user_id]}
                      </span>
                    ) : null}
                    {tx.note ? (
                      <span className="mt-0.5 block max-w-[18rem] truncate text-[11px] text-smoke">
                        {tx.note}
                      </span>
                    ) : null}
                  </td>
                  <td className="td">
                    <span className={clsx("text-xs font-bold", meta.className)}>{meta.label}</span>
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-2">
                      <AssetIcon asset={tx.asset} size={26} />
                      <span className="text-xs font-bold text-chalk">{tx.asset}</span>
                    </span>
                  </td>
                  <td
                    className={clsx(
                      "td text-right font-bold tabular-nums",
                      credit ? "text-mint-400" : "text-flare-300",
                    )}
                  >
                    {directionLabel(tx.direction)}
                    {fmtAmount(tx.amount, tx.asset)}
                  </td>
                  <td className="td text-right text-xs text-fog tabular-nums">
                    {tx.balance_after === null ? "—" : fmtAmount(tx.balance_after, tx.asset)}
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-2">
                      <code className="text-[11px] text-mist">{tx.reference ?? "—"}</code>
                      {tx.reference ? <CopyButton value={tx.reference} compact label="reference" /> : null}
                    </span>
                  </td>
                  <td className="td text-right">
                    <TransactionStatusPill status={tx.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {transactions.map((tx) => {
          const meta = TX_TYPE_META[tx.type];
          const credit = tx.direction === "credit";
          return (
            <li key={tx.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AssetIcon asset={tx.asset} size={38} />
                  <div className="min-w-0">
                    <p className={clsx("text-sm font-bold", meta.className)}>{meta.label}</p>
                    <p className="truncate text-[11px] text-smoke tabular-nums">
                      {fmtDateTime(tx.created_at)}
                    </p>
                    {usernames?.[tx.user_id] ? (
                      <p className="text-[11px] text-flare-400/80">@{usernames[tx.user_id]}</p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={clsx(
                      "text-base font-extrabold tabular-nums",
                      credit ? "text-mint-400" : "text-flare-300",
                    )}
                  >
                    {directionLabel(tx.direction)}
                    {fmtAmount(tx.amount, tx.asset)}
                  </p>
                  <p className="text-[11px] text-smoke tabular-nums">{tx.asset}</p>
                </div>
              </div>

              {tx.note ? <p className="mt-3 text-xs leading-relaxed text-fog">{tx.note}</p> : null}

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                <span className="flex min-w-0 items-center gap-2">
                  <code className="truncate text-[11px] text-smoke">{tx.reference ?? "—"}</code>
                  {tx.reference ? <CopyButton value={tx.reference} compact label="reference" /> : null}
                </span>
                <TransactionStatusPill status={tx.status} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
