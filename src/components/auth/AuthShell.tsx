import Link from "next/link";
import { CheckCircle2, ShieldHalf } from "lucide-react";
import type { ReactNode } from "react";
import { LogoSlot, SiteWordmark } from "@/components/ui/Logo";
import { SITE } from "@/lib/config";

const POINTS = [
  "Sandbox balances in BTC, ETH and USDT",
  "Withdrawals held as Pending for admin review",
  "Full transaction and support history",
  "Instant FAQ answers and human chat support",
];

/** Split-screen shell for sign-in and registration. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="container-x grid min-h-[calc(100dvh-8rem)] gap-10 py-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
      {/* ── Left: brand + reassurance ── */}
      <div className="hidden flex-col gap-8 lg:flex">
        <div className="flex items-center gap-3">
          {/* Logo slot — left empty for your own artwork */}
          <LogoSlot variant="mark" href="/" />
          <SiteWordmark />
        </div>

        <div className="flex flex-col gap-5">
          <span className="eyebrow w-fit">
            <ShieldHalf className="h-3.5 w-3.5" />
            Demonstration sandbox
          </span>
          <h2 className="heading-lg">
            Everything a real desk does,
            <br />
            <span className="text-gradient">with none of the risk</span>
          </h2>
          <p className="lead max-w-md">
            {SITE.name} is an interface and workflow demo. Balances are simulated, withdrawals are
            reviewed by administrators, and no funds ever leave this environment.
          </p>
        </div>

        <ul className="flex max-w-md flex-col gap-3">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-mist">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-flare-400" />
              {point}
            </li>
          ))}
        </ul>

        <div className="rounded-card border border-line bg-night-900/60 p-5">
          <p className="text-xs leading-relaxed text-smoke">
            Looking for answers first?{" "}
            <Link href="/faq" className="font-semibold text-flare-300 hover:text-flare-200">
              Browse the FAQ
            </Link>{" "}
            — every answer loads instantly in your browser.
          </p>
        </div>
      </div>

      {/* ── Right: the form ── */}
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-2 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <LogoSlot variant="mark" href={null} />
            <SiteWordmark />
          </Link>
        </div>
        <div className="w-full max-w-md">
          <p className="mb-4 text-center text-xs font-bold tracking-[0.18em] text-smoke uppercase lg:hidden">
            {title}
          </p>
          {children}
          <p className="mt-6 text-center text-xs text-smoke">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
