"use client";

import { clsx } from "clsx";
import { Ban, Check, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { adminReviewWithdrawalAction } from "@/lib/actions/admin";
import { idleForm } from "@/lib/actions/types";
import { fmtAmount, fmtDateTime } from "@/lib/format";
import type { Withdrawal, WithdrawalStatus } from "@/lib/types";

type Decision = Exclude<WithdrawalStatus, "pending">;

const DECISIONS: Record<
  Decision,
  { label: string; buttonClass: string; icon: typeof Check; reason: string; noteRequired: boolean }
> = {
  approved: {
    label: "Approve",
    buttonClass: "btn-primary",
    icon: Check,
    reason: "Approve and record this request as released.",
    noteRequired: false,
  },
  rejected: {
    label: "Reject",
    buttonClass: "btn-danger",
    icon: X,
    reason: "Reject this request. The held amount returns to the member's balance.",
    noteRequired: true,
  },
  cancelled: {
    label: "Cancel",
    buttonClass: "btn-ghost",
    icon: Ban,
    reason: "Cancel on the member's behalf. The held amount returns to their balance.",
    noteRequired: false,
  },
};

/**
 * Approve / reject / cancel controls for a single withdrawal request.
 * Rejecting requires a reason, which is stored and shown to the member.
 */
export function WithdrawalReviewControls({
  withdrawal,
  size = "md",
}: {
  withdrawal: Withdrawal;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const toast = useToast();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (withdrawal.status !== "pending") {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-line bg-night-850/50 px-3.5 py-2.5">
        <span className="text-[11px] font-bold tracking-[0.14em] text-smoke uppercase">
          {withdrawal.status}
        </span>
        {withdrawal.reviewed_at ? (
          <span className="text-[11px] text-fog tabular-nums">
            {fmtDateTime(withdrawal.reviewed_at)}
          </span>
        ) : null}
        {withdrawal.admin_note ? (
          <span className="mt-1 text-xs leading-snug text-mist">{withdrawal.admin_note}</span>
        ) : null}
      </div>
    );
  }

  function submit() {
    if (!decision) return;
    const config = DECISIONS[decision];
    if (config.noteRequired && !note.trim()) {
      toast("Add a reason so the member can see why it was rejected.", "error");
      return;
    }
    const fd = new FormData();
    fd.set("id", withdrawal.id);
    fd.set("status", decision);
    fd.set("note", note.trim());
    startTransition(async () => {
      const result = await adminReviewWithdrawalAction(idleForm, fd);
      if (result.ok) toast(result.message ?? "Request updated.", "success");
      else toast(result.error ?? "Could not review that request.", "error");
      setDecision(null);
      setNote("");
      router.refresh();
    });
  }

  const config = decision ? DECISIONS[decision] : null;

  return (
    <>
      <div className={clsx("flex flex-wrap gap-2", size === "sm" && "gap-1.5")}>
        {(Object.keys(DECISIONS) as Decision[]).map((key) => {
          const item = DECISIONS[key];
          const Icon = item.icon;
          return (
            <button
              key={key}
              type="button"
              disabled={pending}
              onClick={() => {
                setDecision(key);
                setNote("");
              }}
              className={clsx(item.buttonClass, size === "sm" ? "btn-sm" : "")}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {decision && config ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) setDecision(null);
          }}
        >
          <div className="card-lg w-full max-w-lg p-6 animate-fade-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-chalk">
                  {config.label} withdrawal {withdrawal.reference}
                </h3>
                <p className="mt-1 text-sm text-fog">{config.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setDecision(null)}
                aria-label="Close"
                className="rounded-lg border border-line p-1.5 text-fog transition hover:text-chalk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-night-850/60 p-4 text-xs sm:grid-cols-4">
              <Cell label="Member" value={`@${withdrawal.username}`} />
              <Cell label="Amount" value={`${fmtAmount(withdrawal.amount, withdrawal.asset)} ${withdrawal.asset}`} />
              <Cell label="Payout" value={`${fmtAmount(withdrawal.payout, withdrawal.asset)} ${withdrawal.asset}`} />
              <Cell label="Network" value={withdrawal.network.toUpperCase()} />
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                  Destination
                </dt>
                <dd className="mt-0.5 break-all font-mono text-[11px] text-mist">
                  {withdrawal.wallet_address}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <label htmlFor="review-note" className="label">
                Note for the member {config.noteRequired ? <span className="text-flare-400">*</span> : null}
              </label>
              <textarea
                id="review-note"
                rows={3}
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  config.noteRequired
                    ? "e.g. Address failed the network format check — please resubmit on TRC-20."
                    : "Optional — shown on the member's request record."
                }
                className="field resize-y"
              />
              <p className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-smoke">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-gold-400" />
                  Recorded with your admin identity and a timestamp.
                </span>
                <span className="tabular-nums">{note.length}/300</span>
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDecision(null)}
                disabled={pending}
              >
                Go back
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className={clsx(config.buttonClass, pending && "opacity-60")}
              >
                {pending ? "Working…" : `Confirm ${config.label.toLowerCase()}`}
              </button>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-smoke">
              Sandbox notice: approving records the request as released in the ledger. No real
              cryptocurrency is sent to the address shown.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-mist">{value}</dd>
    </div>
  );
}
