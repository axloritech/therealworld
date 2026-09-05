import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { ThreadStatusPill } from "@/components/ui/StatusPill";
import { fmtDateTime, timeAgo } from "@/lib/format";
import type { SupportThread } from "@/lib/types";

/** Conversation inbox shared by the member dashboard and the admin console. */
export function ThreadList({
  threads,
  basePath,
  showUsername = false,
  emptyTitle = "No conversations yet",
  emptyDescription = "Messages you send to the support team appear here with their replies.",
}: {
  threads: SupportThread[];
  basePath: string;
  showUsername?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquareText className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {threads.map((thread) => (
        <li key={thread.id}>
          <Link
            href={`${basePath}/${thread.id}`}
            className="card card-hover flex items-start justify-between gap-4 p-4 sm:p-5"
          >
            <span className="flex min-w-0 items-start gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.03] text-flare-400">
                <MessageSquareText className="h-4.5 w-4.5" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-bold text-chalk">{thread.subject}</span>
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-smoke">
                  {showUsername ? (
                    <span className="font-bold text-flare-400/90">@{thread.username}</span>
                  ) : null}
                  <span>{thread.message_count} message{thread.message_count === 1 ? "" : "s"}</span>
                  <span className="hidden sm:inline">· opened {fmtDateTime(thread.created_at)}</span>
                  <span>· last {timeAgo(thread.last_message_at)}</span>
                </span>
              </span>
            </span>
            <ThreadStatusPill status={thread.status} className="shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
