import type { Metadata } from "next";
import { MessageSquareText } from "lucide-react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { ThreadList } from "@/components/support/ThreadList";
import { FilterLinks } from "@/components/ui/FilterLinks";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/repo";
import type { ThreadStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Support inbox" };

const STATUSES: { value: ThreadStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const rawStatus = first(params.status);
  const status = STATUSES.some((s) => s.value === rawStatus)
    ? (rawStatus as ThreadStatus)
    : undefined;

  const repo = getRepo();
  const [threads, all] = await Promise.all([
    repo.listThreads({ status, limit: 100 }),
    repo.listThreads({ limit: 200 }),
  ]);

  const counts: Record<string, number> = { open: 0, answered: 0, closed: 0 };
  for (const t of all) counts[t.status] = (counts[t.status] ?? 0) + 1;

  return (
    <AdminFrame
      profile={admin}
      title="Support inbox"
      subtitle="Every conversation members have started. Replies you send appear in their dashboard immediately."
      badge={
        <span className="badge border-flare-500/30 bg-flare-500/10 text-flare-300">
          <MessageSquareText className="h-3.5 w-3.5" />
          {counts.open + counts.answered} active
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        <FilterLinks
          basePath="/admin/support"
          param="status"
          options={STATUSES}
          current={status}
          counts={counts}
        />

        <ThreadList
          threads={threads}
          basePath="/admin/support"
          showUsername
          emptyTitle={status ? `No ${status} conversations` : "No conversations yet"}
          emptyDescription="When a member messages support, the thread lands here with their username and full history."
        />
      </div>
    </AdminFrame>
  );
}
