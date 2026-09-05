"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { SITE } from "@/lib/config";

/**
 * Logo slots.
 *
 * Deliberately EMPTY by default: nothing is rendered inside the frame until you
 * set NEXT_PUBLIC_LOGO_URL (and optionally NEXT_PUBLIC_LOGO_MARK_URL for the
 * square icon). Drop your art in and every slot on the site fills itself.
 */

type Variant = "header" | "footer" | "mark" | "large";

const SIZES: Record<Variant, { box: string; label: string }> = {
  header: { box: "h-9 w-[7.5rem]", label: "Logo" },
  footer: { box: "h-10 w-[8.5rem]", label: "Logo" },
  mark: { box: "h-9 w-9", label: "" },
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
  // If the file has not been dropped into /public yet, fall back to the clean
  // empty slot instead of showing a broken image.
  const src = missing ? "" : configured;

  const frame = (
    <span
      aria-label={size.label || undefined}
      className={clsx(
        "logo-slot",
        size.box,
        // Invisible by default: a clean, empty slot that reserves the exact space.
        !showFrame && !src && "border-transparent bg-transparent",
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
      className="inline-flex shrink-0 items-center rounded-xl transition hover:opacity-90"
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
