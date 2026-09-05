import type { Metadata } from "next";
import { BookOpen, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { NewThreadForm } from "@/components/support/NewThreadForm";
import { ThreadList } from "@/components/support/ThreadList";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const profile = await requireUser("/dashboard/support");
  const threads = await getRepo().listThreads({ userId: profile.id, limit: 100 });

  return (
    <DashboardFrame
      profile={profile}
      title="Customer support"
      subtitle="Message an administrator directly. Every conversation and reply is kept with your account."
      actions={
        <Link href="/faq" className="btn-ghost btn-sm">
          <BookOpen className="h-3.5 w-3.5" />
          Browse FAQ
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <section className="flex flex-col gap-4">
          <header className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-chalk">
              <MessageSquareText className="h-4 w-4 text-flare-400" />
              Your conversations
            </h2>
            <span className="badge border-line bg-white/[0.04] text-mist">{threads.length} total</span>
          </header>
          <ThreadList
            threads={threads}
            basePath="/dashboard/support"
            emptyTitle="No conversations yet"
            emptyDescription="Start one on the right — an administrator reads and replies in the same thread."
          />
        </section>

        <NewThreadForm />
      </div>
    </DashboardFrame>
  );
}
