import Link from "next/link";
import { LogoSlot, SiteWordmark } from "@/components/ui/Logo";
import { SITE } from "@/lib/config";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Markets", href: "/#markets" },
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact support", href: "/dashboard/support" },
      { label: "Withdrawal rules", href: "/faq#withdrawals" },
      { label: "Account security", href: "/faq#security" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Create account", href: "/register" },
      { label: "Sign in", href: "/login" },
      { label: "Balances", href: "/dashboard" },
      { label: "Transactions", href: "/dashboard/transactions" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-line bg-night-1000/60">
      <div className="container-x py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-5">
            {/* Logo area — intentionally left empty for your own artwork */}
            <div className="flex items-center gap-3">
              <LogoSlot variant="mark" href="/" />
              <SiteWordmark />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-fog">
              A demonstration trading interface with sandbox balances in BTC, ETH and USDT,
              administrator-reviewed withdrawals, full transaction history and human support chat.
            </p>
            <div className="flex items-center gap-2 rounded-2xl border border-gold-400/25 bg-gold-400/[0.06] px-4 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-gold-400 animate-pulse-dot" />
              <p className="text-xs leading-relaxed font-semibold text-gold-300">
                Sandbox environment — simulated funds only. No real money or cryptocurrency moves.
              </p>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-bold tracking-[0.18em] text-chalk uppercase">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-fog transition hover:text-flare-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-smoke">
            © {new Date().getFullYear()} {SITE.name}. Demonstration build — not a financial service.
          </p>
          <p className="text-xs text-smoke">
            Prices shown are fixed demo references, not live market data.
          </p>
        </div>
      </div>
    </footer>
  );
}
