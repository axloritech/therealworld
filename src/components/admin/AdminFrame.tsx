import type { ReactNode } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import type { NavItem } from "@/components/dashboard/NavList";
import { getRepo } from "@/lib/repo";
import type { Profile } from "@/lib/types";

/** Admin console frame with live queue badges. */
export async function AdminFrame({
  profile,
  title,
  subtitle,
  actions,
  badge,
  children,
}: {
  profile: Profile;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const repo = getRepo();
  const [pending, threads, users] = await Promise.all([
    repo.listWithdrawals({ status: "pending", limit: 1 }),
    repo.listThreads({ limit: 200 }),
    repo.listProfiles({ limit: 1 }),
  ]);

  const openThreads = threads.filter((t) => t.status !== "closed").length;

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "gauge" },
    { href: "/admin/users", label: "Users", icon: "users", badge: users.total },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: "withdrawals", badge: pending.total },
    { href: "/admin/support", label: "Support", icon: "support", badge: openThreads },
    { href: "/admin/transactions", label: "Ledger", icon: "transactions" },
    { href: "/dashboard", label: "Member view", icon: "overview" },
  ];

  return (
    <AppShell
      profile={profile}
      nav={nav}
      mobileNav={nav.slice(0, 5)}
      title={title}
      subtitle={subtitle}
      actions={actions}
      badge={badge}
      accent="gold"
    >
      {children}
    </AppShell>
  );
}
