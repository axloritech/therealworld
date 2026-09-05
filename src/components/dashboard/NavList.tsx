"use client";

import { clsx } from "clsx";
import {
  ArrowDownToLine,
  ArrowUpRight,
  FileClock,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ICONS = {
  overview: LayoutDashboard,
  gauge: Gauge,
  deposit: ArrowDownToLine,
  withdraw: ArrowUpRight,
  withdrawals: FileClock,
  transactions: ScrollText,
  support: MessageSquareText,
  settings: Settings,
  users: Users,
  security: ShieldCheck,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  badge?: number;
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (pathname === href) return true;
    // Exact roots only match themselves; nested routes match their prefix.
    if (href === "/dashboard" || href === "/admin") return false;
    return pathname.startsWith(`${href}/`);
  };
}

export function SidebarNav({
  items,
  accent,
  label,
}: {
  items: NavItem[];
  accent: "flare" | "gold";
  label: string;
}) {
  const isActive = useIsActive();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? accent === "gold"
                      ? "bg-gold-400/12 text-gold-200"
                      : "bg-flare-500/12 text-flare-200"
                    : "text-fog hover:bg-white/[0.04] hover:text-chalk",
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full",
                      accent === "gold" ? "bg-gold-400" : "bg-flare-500",
                    )}
                  />
                ) : null}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-flare-500 px-1.5 text-[10px] font-bold text-night-1000">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNav({
  items,
  accent,
}: {
  items: NavItem[];
  accent: "flare" | "gold";
}) {
  const isActive = useIsActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night-950/95 backdrop-blur-xl lg:hidden"
      aria-label="Primary"
    >
      <ul className="no-scrollbar flex items-stretch overflow-x-auto">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = isActive(item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex flex-col items-center gap-1 px-1.5 py-2.5 text-[10px] font-bold transition",
                  active
                    ? accent === "gold"
                      ? "text-gold-300"
                      : "text-flare-300"
                    : "text-smoke hover:text-chalk",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-flare-500 px-1 text-[9px] font-bold text-night-1000">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
