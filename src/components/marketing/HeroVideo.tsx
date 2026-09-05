"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import type { VideoSource } from "@/lib/config";

/**
 * Click-to-load video frame supporting both YouTube and Vimeo.
 *
 * Nothing is requested from either provider (no cookies, no third-party
 * scripts, no thumbnail fetch for Vimeo) until the visitor presses play. When
 * no video is configured the slot renders an empty framed panel at the exact
 * same aspect ratio, so the layout never shifts once one is added.
 */
export function HeroVideo({
  video,
  title,
  label = "Watch the platform tour",
  className,
}: {
  video: VideoSource | null;
  title: string;
  /** Caption under the play button. */
  label?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const embedSrc =
    video?.kind === "vimeo"
      ? `https://player.vimeo.com/video/${video.id}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`
      : video?.kind === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
        : null;

  return (
    <div className={clsx("relative", className)}>
      {/* Warm glow behind the frame */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-500/25 via-gold-500/10 to-transparent blur-3xl"
      />

      <div className="card-lg relative overflow-hidden p-2 sm:p-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-card bg-night-1000">
          {embedSrc && playing ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={embedSrc}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : video ? (
            <>
              {video.kind === "youtube" && !posterFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`}
                  alt=""
                  onError={() => setPosterFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              ) : null}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(90%_90%_at_50%_10%,rgba(237,161,67,0.16),transparent_60%),linear-gradient(to_top,#000,#00000055_45%,transparent)]"
              />
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4"
                aria-label={`Play video: ${title}`}
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white shadow-[0_16px_44px_-12px_rgba(237,161,67,0.8)] transition duration-300 group-hover:scale-110 group-hover:bg-brand-400 sm:h-20 sm:w-20">
                  <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
                </span>
                <span className="rounded-pill border border-line bg-night-950/80 px-4 py-1.5 text-xs font-semibold text-mist backdrop-blur">
                  {label}
                </span>
              </button>
            </>
          ) : (
            <EmptyVideoSlot title={title} />
          )}
        </div>
      </div>

      {/* Floating accent card */}
      {video ? (
        <div className="pointer-events-none absolute -bottom-5 left-6 hidden rounded-2xl border border-line bg-night-900/95 px-4 py-3 shadow-card backdrop-blur sm:block animate-float">
          <p className="text-[10px] font-bold tracking-[0.18em] text-fog uppercase">Now showing</p>
          <p className="mt-0.5 max-w-[15rem] truncate text-sm font-semibold text-chalk">{title}</p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyVideoSlot({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_120%_at_50%_0%,rgba(237,161,67,0.12),transparent_60%)] px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-line-strong text-fog">
          <Play className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-mist">Video slot</p>
        <p className="max-w-xs text-xs leading-relaxed text-smoke">
          Set <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-brand-300">NEXT_PUBLIC_HERO_VIDEO</code>{" "}
          (YouTube or Vimeo) to load “{title}” here.
        </p>
      </div>
    </div>
  );
}
