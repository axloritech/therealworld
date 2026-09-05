import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { ChatPanel } from "@/components/support/ChatPanel";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { closeThreadAction } from "@/lib/actions/support";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const profile = await requireUser(`/dashboard/support/${threadId}`);

  const repo = getRepo();
  const thread = await repo.getThread(threadId);
  if (!thread) notFound();
  if (thread.user_id !== profile.id && profile.role !== "admin") redirect("/dashboard/support");

  const messages = await repo.listMessages(threadId);

  return (
    <DashboardFrame
      profile={profile}
      title="Support conversation"
      subtitle={`Opened ${fmtDateTime(thread.created_at)} · ${messages.length} message${messages.length === 1 ? "" : "s"}`}
      actions={
        <>
          {thread.status !== "closed" ? (
            <ConfirmAction
              action={closeThreadAction}
              hiddenFields={{ id: thread.id }}
              title="Close this conversation?"
              description="You can still read the full history, but you will need to start a new conversation to send more messages."
              confirmLabel="Close conversation"
              cancelLabel="Keep it open"
              variant="ghost"
              triggerClassName="btn-ghost btn-sm"
            >
              Close thread
            </ConfirmAction>
          ) : null}
          <Link href="/dashboard/support" className="btn-ghost btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            All conversations
          </Link>
        </>
      }
    >
      <ChatPanel
        threadId={thread.id}
        viewerRole={profile.role}
        viewerName={profile.full_name || profile.username}
        counterpartyLabel={profile.role === "admin" ? `@${thread.username}` : "Support team"}
        subject={thread.subject}
        initialStatus={thread.status}
        initialMessages={messages}
      />
    </DashboardFrame>
  );
}
