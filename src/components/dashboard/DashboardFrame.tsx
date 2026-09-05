import type { ReactNode } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import type { NavItem } from "@/components/dashboard/NavList";
import { getRepo } from "@/lib/repo";
import type { Profile } from "@/lib/types";

/**
 * Member dashboard frame. Computes live nav badges (pending withdrawal
 * requests and open support conversations) and renders the shared shell.
 */
export async function DashboardFrame({
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
  const [pending, threads] = await Promise.all([
    repo.listWithdrawals({ userId: profile.id, status: "pending", limit: 1 }),
    repo.listThreads({ userId: profile.id, limit: 100 }),
  ]);

  const openThreads = threads.filter((t) => t.status !== "closed").length;

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "overview" },
    { href: "/dashboard/deposit", label: "Deposit", icon: "deposit" },
    { href: "/dashboard/withdraw", label: "Withdraw", icon: "withdraw" },
    { href: "/dashboard/withdrawals", label: "Withdrawals", icon: "withdrawals", badge: pending.total },
    { href: "/dashboard/transactions", label: "Transactions", icon: "transactions" },
    { href: "/dashboard/support", label: "Support", icon: "support", badge: openThreads },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];

  const mobileNav: NavItem[] = [
    nav[0],
    nav[1],
    nav[2],
    nav[5],
    nav[6],
  ];

  return (
    <AppShell
      profile={profile}
      nav={nav}
      mobileNav={mobileNav}
      title={title}
      subtitle={subtitle}
      actions={actions}
      badge={badge}
      accent="flare"
    >
      {children}
    </AppShell>
  );
}
