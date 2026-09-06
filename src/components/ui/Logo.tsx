"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { SITE } from "@/lib/config";

/**
 * Logo slots.
 *
 * Ships with the circular transparent brand mark at /public/logo.png; every
 * slot fills itself with it. The frame is a perfect circle (rounded-full +
 * overflow-hidden) so round marks sit flush, and the dashed placeholder
 * outline only appears while no art is configured (or `showFrame` is set).
 */

type Variant = "header" | "footer" | "mark" | "large";

const SIZES: Record<Variant, { box: string; label: string }> = {
  header: { box: "h-9 w-[7.5rem]", label: "Logo" },
  footer: { box: "h-10 w-[8.5rem]", label: "Logo" },
  // Square box for the circular mark — rounded-full + overflow-hidden trim it
  // to a perfect circle with no corner bleed.
  mark: { box: "h-9 w-9 rounded-full overflow-hidden", label: "" },
  large: { box: "h-14 w-[10.5rem]", label: "Logo" },
};

export function LogoSlot({
  variant = "header",
  className,
  href = "/",
  showFrame = false,
}: {
  variant?: Variant;
  className?: string;
  href?: string | null;
  /** Render the dashed placeholder outline (off by default so slots look intentionally empty). */
  showFrame?: boolean;
}) {
  const [missing, setMissing] = useState(false);
  const size = SIZES[variant];
  const configured =
    variant === "mark" ? SITE.logoMarkUrl || SITE.logoUrl : SITE.logoUrl || SITE.logoMarkUrl;
  // If the configured art cannot be loaded, fall back to the clean empty slot
  // instead of showing a broken image.
  const src = missing ? "" : configured;

  const frame = (
    <span
      aria-label={size.label || undefined}
      className={clsx(
        "logo-slot",
        size.box,
        // With real art the frame goes fully invisible — the circular mark
        // floats seamlessly. The dashed outline only shows for empty slots
        // or when a placeholder frame is explicitly requested.
        !showFrame && "border-transparent bg-transparent",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={SITE.name}
          onError={() => setMissing(true)}
          className="h-full w-full object-contain"
        />
      ) : null}
    </span>
  );

  if (!href) return frame;

  return (
    <a
      href={href}
      className="inline-flex shrink-0 items-center rounded-full transition hover:opacity-90"
      aria-label={SITE.name}
    >
      {frame}
    </a>
  );
}

/** Wordmark shown only when no logo art has been supplied. */
export function SiteWordmark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "text-sm font-extrabold tracking-[0.22em] whitespace-nowrap text-chalk uppercase",
        className,
      )}
    >
      {SITE.name}
    </span>
  );
}
