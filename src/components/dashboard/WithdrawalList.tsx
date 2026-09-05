import { FileClock } from "lucide-react";
import { clsx } from "clsx";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { WithdrawalStatusPill } from "@/components/ui/StatusPill";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { cancelWithdrawalAction } from "@/lib/actions/funds";
import { fmtAmount, fmtDateTime, maskAddress } from "@/lib/format";
import type { Withdrawal } from "@/lib/types";

/**
 * Withdrawal requests with their review state.
 * `cancelForUserId` enables self-service cancellation of pending requests.
 */
export function WithdrawalList({
  withdrawals,
  cancelForUserId,
  emptyTitle = "No withdrawal requests yet",
  emptyDescription = "When you request a withdrawal it appears here as Pending until an administrator approves, rejects or you cancel it.",
}: {
  withdrawals: Withdrawal[];
  cancelForUserId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (withdrawals.length === 0) {
    return (
      <EmptyState
        icon={<FileClock className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden overflow-hidden rounded-card border border-line lg:block">
        <table className="w-full border-collapse">
          <thead className="border-b border-line bg-night-900/70">
            <tr>
              <th className="th">Requested</th>
              <th className="th">Asset</th>
              <th className="th text-right">Amount</th>
              <th className="th text-right">Fee</th>
              <th className="th text-right">Payout</th>
              <th className="th">Destination</th>
              <th className="th">Reference</th>
              <th className="th text-center">Status</th>
              {cancelForUserId ? <th className="th text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr
                key={w.id}
                className="border-b border-line/60 transition last:border-0 hover:bg-white/[0.02]"
              >
                <td className="td whitespace-nowrap">
                  <span className="block text-xs font-semibold text-mist tabular-nums">
                    {fmtDateTime(w.created_at)}
                  </span>
                  {w.reviewed_at ? (
                    <span className="block text-[11px] text-smoke tabular-nums">
                      Reviewed {fmtDateTime(w.reviewed_at)}
                    </span>
                  ) : null}
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
                <td className="td text-right font-bold text-chalk tabular-nums">
                  {fmtAmount(w.amount, w.asset)}
                </td>
                <td className="td text-right text-xs text-fog tabular-nums">
                  {fmtAmount(w.fee, w.asset)}
                </td>
                <td className="td text-right font-semibold text-mint-400 tabular-nums">
                  {fmtAmount(w.payout, w.asset)}
                </td>
                <td className="td">
                  <span className="flex items-center gap-2">
                    <code className="text-[11px] text-mist">{maskAddress(w.wallet_address)}</code>
                    <CopyButton value={w.wallet_address} compact label="address" />
                  </span>
                </td>
                <td className="td">
                  <span className="flex items-center gap-2">
                    <code className="text-[11px] text-mist">{w.reference}</code>
                    <CopyButton value={w.reference} compact label="reference" />
                  </span>
                </td>
                <td className="td text-center">
                  <WithdrawalStatusPill status={w.status} />
                  {w.admin_note ? (
                    <span className="mt-1.5 block max-w-[16rem] text-[11px] leading-snug text-smoke">
                      {w.admin_note}
                    </span>
                  ) : null}
                </td>
                {cancelForUserId ? (
                  <td className="td text-right">
                    {w.status === "pending" && w.user_id === cancelForUserId ? (
                      <ConfirmAction
                        action={cancelWithdrawalAction}
                        hiddenFields={{ id: w.id }}
                        title="Cancel this withdrawal request?"
                        description={
                          <>
                            <span className="font-bold text-chalk">
                              {fmtAmount(w.amount, w.asset)} {w.asset}
                            </span>{" "}
                            will be returned to your available balance immediately and the ledger
                            entry marked reversed.
                          </>
                        }
                        confirmLabel="Cancel request"
                        cancelLabel="Keep it pending"
                      >
                        Cancel
                      </ConfirmAction>
                    ) : (
                      <span className="text-[11px] text-smoke">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile / tablet cards ── */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {withdrawals.map((w) => {
          const cancellable = cancelForUserId && w.status === "pending" && w.user_id === cancelForUserId;
          return (
            <li key={w.id} className={clsx("card p-4", w.status === "pending" && "border-gold-400/25")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AssetIcon asset={w.asset} size={38} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-chalk">
                      {fmtAmount(w.amount, w.asset)} {w.asset}
                    </p>
                    <p className="truncate text-[11px] text-smoke uppercase">
                      {w.network} network
                    </p>
                  </div>
                </div>
                <WithdrawalStatusPill status={w.status} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                <Cell label="Requested" value={fmtDateTime(w.created_at)} />
                <Cell label="Payout" value={`${fmtAmount(w.payout, w.asset)} ${w.asset}`} accent />
                <Cell label="Fee" value={`${fmtAmount(w.fee, w.asset)} ${w.asset}`} />
                <Cell label="Reference" value={w.reference} copy />
              </dl>

              <div className="mt-3 rounded-xl border border-line bg-night-850/60 px-3 py-2.5">
                <p className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                  Destination wallet
                </p>
                <p className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-[11px] text-mist">
                    {w.wallet_address}
                  </code>
                  <CopyButton value={w.wallet_address} compact label="address" />
                </p>
              </div>

              {w.admin_note ? (
                <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-mist">
                  <span className="font-bold text-fog">Admin note: </span>
                  {w.admin_note}
                </p>
              ) : null}

              {cancellable ? (
                <div className="mt-3">
                  <ConfirmAction
                    action={cancelWithdrawalAction}
                    hiddenFields={{ id: w.id }}
                    title="Cancel this withdrawal request?"
                    description={
                      <>
                        <span className="font-bold text-chalk">
                          {fmtAmount(w.amount, w.asset)} {w.asset}
                        </span>{" "}
                        returns to your balance immediately.
                      </>
                    }
                    confirmLabel="Cancel request"
                    cancelLabel="Keep it pending"
                    triggerClassName="btn-danger btn-sm btn-block"
                  >
                    Cancel request
                  </ConfirmAction>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Cell({
  label,
  value,
  accent,
  copy,
}: {
  label: string;
  value: string;
  accent?: boolean;
  copy?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">{label}</dt>
      <dd
        className={clsx(
          "mt-0.5 flex min-w-0 items-center gap-2 text-xs",
          accent ? "font-bold text-mint-400" : "font-semibold text-mist",
        )}
      >
        <span className="truncate tabular-nums">{value}</span>
        {copy ? <CopyButton value={value} compact label={label} /> : null}
      </dd>
    </div>
  );
}
