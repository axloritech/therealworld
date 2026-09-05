"use client";

import { clsx } from "clsx";
import { LayoutDashboard, Menu, Shield, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoSlot, SiteWordmark } from "@/components/ui/Logo";
import { SITE } from "@/lib/config";

const NAV = [
  { href: "/#markets", label: "Markets" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader({
  user,
  mode,
}: {
  user: { username: string; role: string } | null;
  mode: "demo" | "supabase";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href.startsWith("/#") ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full transition duration-300",
        scrolled
          ? "border-b border-line bg-night-950/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        {/* ── Logo area (empty until you drop in your own mark) ── */}
        <div className="flex min-w-0 items-center gap-3">
          <LogoSlot variant="mark" href="/" />
          <div className="flex min-w-0 flex-col">
            <Link href="/" className="truncate">
              <SiteWordmark />
            </Link>
            <span className="text-[10px] font-semibold tracking-[0.18em] text-smoke uppercase">
              {mode === "demo" ? "Sandbox demo" : "Trading platform"}
            </span>
          </div>
        </div>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("nav-link", isActive(item.href) && "nav-link-active")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className="btn-ghost btn-sm">
                {user.role === "admin" ? (
                  <Shield className="h-3.5 w-3.5 text-flare-400" />
                ) : (
                  <LayoutDashboard className="h-3.5 w-3.5" />
                )}
                {user.role === "admin" ? "Admin panel" : "Dashboard"}
              </Link>
              <span className="max-w-[9rem] truncate text-xs text-fog">@{user.username}</span>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Open demo account
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile trigger ── */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[0.03] text-chalk transition hover:border-flare-500/40 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile sheet ── */}
      {open ? (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-night-950/98 px-4 pt-6 pb-28 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-2xl px-4 py-3.5 text-base font-semibold transition",
                  isActive(item.href)
                    ? "bg-flare-500/12 text-flare-200"
                    : "text-mist hover:bg-white/[0.04] hover:text-chalk",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
            {user ? (
              <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="btn-primary btn-block btn-lg"
                >
                  {user.role === "admin" ? <Shield className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                  {user.role === "admin" ? "Admin panel" : "My dashboard"}
                </Link>
                <p className="text-center text-xs text-fog">Signed in as @{user.username}</p>
              </>
            ) : (
              <>
                <Link href="/register" className="btn-primary btn-block btn-lg">
                  Open demo account
                </Link>
                <Link href="/login" className="btn-ghost btn-block btn-lg">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-smoke">
            {SITE.name} is a demonstration sandbox. No real money or cryptocurrency is held,
            transferred or exchanged.
          </p>
        </div>
      ) : null}
    </header>
  );
}
