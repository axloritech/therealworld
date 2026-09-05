import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, RotateCcw, CheckCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { ChatPanel } from "@/components/support/ChatPanel";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { setThreadStatusAction } from "@/lib/actions/support";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { getRepo } from "@/lib/repo";
import type { ThreadStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Conversation" };

const ACTIONS: { status: ThreadStatus; label: string; icon: typeof RotateCcw; variant: "ghost" | "primary" | "danger" }[] = [
  { status: "open", label: "Reopen", icon: RotateCcw, variant: "ghost" },
  { status: "answered", label: "Mark answered", icon: CheckCheck, variant: "primary" },
  { status: "closed", label: "Close", icon: XCircle, variant: "danger" },
];

export default async function AdminThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const admin = await requireAdmin();
  const { threadId } = await params;

  const repo = getRepo();
  const thread = await repo.getThread(threadId);
  if (!thread) notFound();

  const [messages, member] = await Promise.all([
    repo.listMessages(threadId),
    repo.findProfileById(thread.user_id),
  ]);

  return (
    <AdminFrame
      profile={admin}
      title="Support conversation"
      subtitle={`@${thread.username} · opened ${fmtDateTime(thread.created_at)} · ${messages.length} message${messages.length === 1 ? "" : "s"}`}
      actions={
        <>
          {ACTIONS.filter((a) => a.status !== thread.status).map((a) => (
            <ConfirmAction
              key={a.status}
              action={setThreadStatusAction}
              hiddenFields={{ id: thread.id, status: a.status }}
              title={`${a.label} this conversation?`}
              description={
                a.status === "closed"
                  ? "The member keeps the full history but cannot send new messages in this thread."
                  : `The thread status will change to “${a.status}” for both sides.`
              }
              confirmLabel={a.label}
              cancelLabel="Go back"
              variant={a.variant}
              triggerClassName={
                a.variant === "primary" ? "btn-primary btn-sm" : a.variant === "danger" ? "btn-danger btn-sm" : "btn-ghost btn-sm"
              }
            >
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </ConfirmAction>
          ))}
          <Link href="/admin/support" className="btn-ghost btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Inbox
          </Link>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <ChatPanel
          threadId={thread.id}
          viewerRole="admin"
          viewerName={admin.full_name || admin.username}
          counterpartyLabel={`@${thread.username}`}
          subject={thread.subject}
          initialStatus={thread.status}
          initialMessages={messages}
        />

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">Member</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link
                href={`/admin/users/${thread.username}`}
                className="flex items-center justify-between gap-2 text-sm font-bold text-flare-300 hover:text-flare-200"
              >
                @{thread.username}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <p className="text-xs text-fog">{member?.full_name ?? "No display name"}</p>
              <p className="truncate text-xs text-smoke">{member?.email ?? "—"}</p>
              {member ? (
                <p className="text-[11px] text-smoke">
                  Joined {fmtDateTime(member.created_at)}
                </p>
              ) : null}
            </div>
            <Link href={`/admin/users/${thread.username}`} className="btn-ghost btn-sm btn-block mt-4">
              Open member profile
            </Link>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">
              Reply guidance
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-mist">
              <li>• Replies post instantly to the member's dashboard chat.</li>
              <li>• Sending a reply marks the thread as answered automatically.</li>
              <li>• Quote the withdrawal reference when discussing a request.</li>
              <li>• Never ask for passwords or seed phrases — not even in a sandbox.</li>
            </ul>
          </div>
        </aside>
      </div>
    </AdminFrame>
  );
}
