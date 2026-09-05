import { clsx } from "clsx";
import { THREAD_STATUS_META, WITHDRAWAL_STATUS_META } from "@/lib/format";
import type { ThreadStatus, WithdrawalStatus } from "@/lib/types";

export function WithdrawalStatusPill({
  status,
  className,
}: {
  status: WithdrawalStatus;
  className?: string;
}) {
  const meta = WITHDRAWAL_STATUS_META[status] ?? WITHDRAWAL_STATUS_META.pending;
  return (
    <span className={clsx("badge", meta.className, className)}>
      <span
        className={clsx("h-1.5 w-1.5 rounded-full", meta.dot, status === "pending" && "animate-pulse-dot")}
      />
      {meta.label}
    </span>
  );
}

export function ThreadStatusPill({ status, className }: { status: ThreadStatus; className?: string }) {
  const meta = THREAD_STATUS_META[status] ?? THREAD_STATUS_META.open;
  return <span className={clsx("badge", meta.className, className)}>{meta.label}</span>;
}

export function RolePill({ role, className }: { role: string; className?: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={clsx(
        "badge",
        isAdmin
          ? "border-flare-500/40 bg-flare-500/12 text-flare-300"
          : "border-line bg-white/[0.04] text-mist",
        className,
      )}
    >
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

export function TransactionStatusPill({
  status,
  className,
}: {
  status: "completed" | "pending" | "reversed";
  className?: string;
}) {
  const map = {
    completed: { label: "Completed", cls: "border-mint-500/30 bg-mint-500/10 text-mint-400" },
    pending: { label: "Pending", cls: "border-gold-400/30 bg-gold-400/10 text-gold-300" },
    reversed: { label: "Reversed", cls: "border-rose-500/30 bg-rose-500/10 text-rose-400" },
  } as const;
  const meta = map[status] ?? map.completed;
  return <span className={clsx("badge", meta.cls, className)}>{meta.label}</span>;
}
