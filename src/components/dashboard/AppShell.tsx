import { clsx } from "clsx";
import { ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoSlot, SiteWordmark } from "@/components/ui/Logo";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { MobileNav, SidebarNav, type NavItem } from "./NavList";
import { SignOutButton } from "./SignOutButton";

/**
 * Shared application chrome for the member dashboard and the admin console:
 * a persistent sidebar on desktop, a top bar plus a bottom tab bar on mobile.
 */
export function AppShell({
  profile,
  nav,
  title,
  subtitle,
  actions,
  children,
  accent = "flare",
  badge,
  mobileNav,
}: {
  profile: Profile;
  nav: NavItem[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  accent?: "flare" | "gold";
  /** Small pill shown next to the title (e.g. request reference). */
  badge?: ReactNode;
  /** Curated tab bar for small screens (defaults to the first five items). */
  mobileNav?: NavItem[];
}) {
  const label = accent === "gold" ? "Admin console" : "Member area";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      {/* ══════════ Sidebar (desktop) ══════════ */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-night-950/70 lg:flex">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <LogoSlot variant="mark" href="/" />
          <div className="flex min-w-0 flex-col">
            <SiteWordmark className="text-xs" />
            <span className="text-[10px] font-bold tracking-[0.16em] text-smoke uppercase">
              {label}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav items={nav} accent={accent} label={label} />

          <div className="mt-8 border-t border-line pt-5">
            <p className="px-3 text-[10px] font-bold tracking-[0.16em] text-smoke uppercase">
              Shortcuts
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              <li>
                <Link
                  href="/"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-fog transition hover:bg-white/[0.04] hover:text-chalk"
                >
                  <ExternalLink className="h-[18px] w-[18px]" />
                  View public site
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-fog transition hover:bg-white/[0.04] hover:text-chalk"
                >
                  <ShieldCheck className="h-[18px] w-[18px]" />
                  Help centre
                </Link>
              </li>
              {profile.role === "admin" ? (
                <li>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-fog transition hover:bg-white/[0.04] hover:text-chalk"
                  >
                    <ShieldCheck className="h-[18px] w-[18px]" />
                    My member view
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="border-t border-line p-3">
          <div className="rounded-2xl border border-line bg-night-900/70 p-3">
            <div className="flex items-center gap-3">
              <Avatar profile={profile} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-chalk">@{profile.username}</p>
                <p className="truncate text-[11px] text-fog">
                  {profile.role === "admin" ? "Administrator" : "Member"}
                </p>
              </div>
            </div>
            <SignOutButton className="btn-sm btn-block mt-3" />
          </div>
        </div>
      </aside>

      {/* ══════════ Main column ══════════ */}
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-night-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoSlot variant="mark" href="/" />
            <div className="min-w-0">
              <SiteWordmark className="text-[11px]" />
              <p className="truncate text-[10px] font-bold tracking-[0.14em] text-smoke uppercase">
                {label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[8rem] truncate text-xs text-fog sm:inline">
              @{profile.username}
            </span>
            <Avatar profile={profile} size={34} />
            <SignOutButton iconOnly />
          </div>
        </header>

        <div className="border-b border-line bg-night-950/40">
          <div className="container-x flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between lg:py-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold text-chalk lg:text-3xl">{title}</h1>
                {badge}
              </div>
              {subtitle ? <p className="mt-1.5 text-sm text-fog">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
          </div>
        </div>

        <main className="container-x flex-1 py-6 pb-28 lg:py-8 lg:pb-12">{children}</main>
      </div>

      <MobileNav items={mobileNav ?? nav.slice(0, 5)} accent={accent} />
    </div>
  );
}

export function Avatar({ profile, size = 38 }: { profile: Profile; size?: number }) {
  const isAdmin = profile.role === "admin";
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-xl border font-bold",
        isAdmin
          ? "border-gold-400/40 bg-gold-400/12 text-gold-300"
          : "border-flare-500/35 bg-flare-500/12 text-flare-300",
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(profile.full_name || profile.username, profile.username.slice(0, 2).toUpperCase())}
    </span>
  );
}
