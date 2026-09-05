import { Compass } from "lucide-react";
import Link from "next/link";
import { LogoSlot, SiteWordmark } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Link href="/" className="flex items-center gap-3">
        <LogoSlot variant="mark" href={null} />
        <SiteWordmark />
      </Link>

      <div className="flex flex-col items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-flare-500/30 bg-flare-500/[0.08] text-flare-400">
          <Compass className="h-6 w-6" />
        </span>
        <p className="text-[11px] font-bold tracking-[0.2em] text-flare-400 uppercase">
          Error 404
        </p>
        <h1 className="heading-lg max-w-lg">This page does not exist</h1>
        <p className="lead max-w-md">
          The link may be out of date, or the record it pointed to has been removed from the
          sandbox.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary btn-lg">
          Back to home
        </Link>
        <Link href="/dashboard" className="btn-ghost btn-lg">
          Open dashboard
        </Link>
      </div>

      <p className="max-w-md text-xs leading-relaxed text-smoke">
        Looking for help? The FAQ answers every question about balances, withdrawals and support.
      </p>
      <Link href="/faq" className="btn-outline btn-sm">
        Browse the FAQ
      </Link>
    </div>
  );
}
